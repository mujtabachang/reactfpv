/**
 * Realistic Drone Physics Engine
 *
 * Uses SI units throughout:
 * - Mass: kg
 * - Length: m
 * - Time: s
 * - Velocity: m/s
 * - Acceleration: m/s²
 * - Force: N (Newton)
 * - Angular velocity: rad/s
 * - Torque: N·m
 */

import * as THREE from 'three';
import { DronePhysicsSettings } from '../types';

// Physical constants
export const PHYSICS_CONSTANTS = {
  GRAVITY: 9.81,           // m/s² - gravitational acceleration
  AIR_DENSITY: 1.225,      // kg/m³ - air density at sea level
  AIR_VISCOSITY: 1.81e-5,  // Pa·s - dynamic viscosity of air
};

// Simplified drone specs used by physics engine
export interface DroneSpecs {
  mass: number;              // kg - total mass including battery
  maxThrust: number;         // N - maximum thrust per motor
  dragCoefficient: number;   // dimensionless - aerodynamic drag coefficient
  frontalArea: number;       // m² - frontal cross-sectional area
  angularDrag: number;       // How quickly rotation stops
  responsiveness: number;    // How snappy controls are
}

// Default specs for a 5" FPV racing quad
export const DEFAULT_DRONE_SPECS: DroneSpecs = {
  mass: 0.65,               // 650g with battery
  maxThrust: 4.5,           // ~450g thrust per motor
  dragCoefficient: 1.0,     // Approximate for quadcopter
  frontalArea: 0.01,        // ~100cm² frontal area
  angularDrag: 3.0,         // How quickly rotation stops
  responsiveness: 12,       // How snappy controls are
};

// Helper to create DroneSpecs from DronePhysicsSettings
export function createSpecsFromSettings(settings: DronePhysicsSettings): DroneSpecs {
  // Estimate frontal area based on mass (larger quads have larger frontal area)
  const frontalArea = 0.005 + settings.mass * 0.01;

  return {
    mass: settings.mass,
    maxThrust: settings.maxThrust,
    dragCoefficient: settings.dragCoefficient,
    frontalArea,
    angularDrag: settings.angularDrag,
    responsiveness: settings.responsiveness,
  };
}

// Wind configuration
export interface WindConfig {
  enabled: boolean;
  baseSpeed: number;        // m/s - constant wind speed
  direction: THREE.Vector3; // normalized direction vector
  gustStrength: number;     // m/s - additional gust magnitude
  gustFrequency: number;    // Hz - how often gusts occur
  turbulenceScale: number;  // 0-1 - intensity of random turbulence
}

export const DEFAULT_WIND_CONFIG: WindConfig = {
  enabled: false,
  baseSpeed: 0,
  direction: new THREE.Vector3(1, 0, 0),
  gustStrength: 0,
  gustFrequency: 0.5,
  turbulenceScale: 0,
};

// Physics state
export interface PhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
}

// Motor outputs (0-1 for each motor)
export interface MotorOutputs {
  frontLeft: number;
  frontRight: number;
  rearLeft: number;
  rearRight: number;
}

/**
 * Drone Physics Engine
 * Implements realistic quadcopter dynamics
 */
export class DronePhysicsEngine {
  private specs: DroneSpecs;
  private windConfig: WindConfig;
  private gustPhase: number = 0;
  private turbulenceOffset: THREE.Vector3 = new THREE.Vector3();

  // Reusable vectors to avoid garbage collection
  private tempVec1 = new THREE.Vector3();
  private tempVec2 = new THREE.Vector3();
  private tempVec3 = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();

  constructor(specs: DroneSpecs = DEFAULT_DRONE_SPECS, windConfig: WindConfig = DEFAULT_WIND_CONFIG) {
    this.specs = { ...specs };
    this.windConfig = { ...windConfig, direction: windConfig.direction.clone() };
  }

  updateSpecs(specs: Partial<DroneSpecs>): void {
    Object.assign(this.specs, specs);
  }

  updateWindConfig(config: Partial<WindConfig>): void {
    if (config.direction) {
      this.windConfig.direction = config.direction.clone().normalize();
    }
    Object.assign(this.windConfig, config);
  }

  /**
   * Calculate thrust force from throttle input
   */
  private calculateThrust(throttle: number): number {
    const normalizedThrottle = Math.max(0, Math.min(1, throttle));

    // Linear throttle response
    // Total thrust from all 4 motors
    return 4 * this.specs.maxThrust * normalizedThrottle;
  }

  /**
   * Calculate aerodynamic drag force
   * F_drag = 0.5 * ρ * v² * Cd * A
   */
  private calculateDrag(velocity: THREE.Vector3, airVelocity: THREE.Vector3): THREE.Vector3 {
    // Relative velocity (drone velocity minus air velocity)
    this.tempVec1.copy(velocity).sub(airVelocity);

    const speed = this.tempVec1.length();
    if (speed < 0.001) {
      return this.tempVec2.set(0, 0, 0);
    }

    // Drag magnitude
    const dragMagnitude = 0.5 * PHYSICS_CONSTANTS.AIR_DENSITY *
                          speed * speed *
                          this.specs.dragCoefficient *
                          this.specs.frontalArea;

    // Drag force opposes velocity
    this.tempVec2.copy(this.tempVec1).normalize().multiplyScalar(-dragMagnitude);

    return this.tempVec2;
  }

  /**
   * Calculate angular drag (resistance to rotation)
   * Simplified model based on angular velocity
   */
  private calculateAngularDrag(angularVelocity: THREE.Vector3): THREE.Vector3 {
    // Angular drag coefficient (empirical, tuned for feel)
    const angularDragCoeff = 0.04;

    this.tempVec1.copy(angularVelocity).multiplyScalar(-angularDragCoeff);

    return this.tempVec1;
  }

  /**
   * Calculate wind velocity at current time and position
   * Includes base wind, gusts, and turbulence
   */
  private calculateWindVelocity(time: number, position: THREE.Vector3): THREE.Vector3 {
    if (!this.windConfig.enabled) {
      return this.tempVec1.set(0, 0, 0);
    }

    // Base wind
    this.tempVec1.copy(this.windConfig.direction).multiplyScalar(this.windConfig.baseSpeed);

    // Gusts (periodic with some randomness)
    if (this.windConfig.gustStrength > 0) {
      this.gustPhase += this.windConfig.gustFrequency * 0.016; // Assuming ~60fps
      const gustFactor = Math.max(0, Math.sin(this.gustPhase * Math.PI * 2) *
                                     Math.sin(this.gustPhase * Math.PI * 0.7));
      this.tempVec2.copy(this.windConfig.direction).multiplyScalar(
        gustFactor * this.windConfig.gustStrength
      );
      this.tempVec1.add(this.tempVec2);
    }

    // Turbulence (Perlin-like noise approximation)
    if (this.windConfig.turbulenceScale > 0) {
      const turbScale = this.windConfig.turbulenceScale * 2;
      const t = time * 0.5;
      const px = position.x * 0.1 + t;
      const py = position.y * 0.1 + t * 0.7;
      const pz = position.z * 0.1 + t * 0.3;

      // Simple noise approximation using sin functions
      this.turbulenceOffset.set(
        Math.sin(px * 2.3) * Math.cos(py * 1.7) * turbScale,
        Math.sin(py * 2.1) * Math.cos(pz * 1.9) * turbScale * 0.5, // Less vertical turbulence
        Math.sin(pz * 2.5) * Math.cos(px * 1.3) * turbScale
      );
      this.tempVec1.add(this.turbulenceOffset);
    }

    return this.tempVec1;
  }

  /**
   * Main physics update step
   * Implements semi-implicit Euler integration
   */
  step(
    state: PhysicsState,
    throttle: number,       // 0-1
    rollRate: number,       // rad/s (desired)
    pitchRate: number,      // rad/s (desired)
    yawRate: number,        // rad/s (desired)
    dt: number,             // seconds
    time: number            // total elapsed time
  ): PhysicsState {
    const { mass, inertia } = this.specs;

    // Clamp dt to prevent instability
    dt = Math.min(dt, 0.05);

    // --- Calculate Forces ---

    // Gravity (create new vector to avoid reference issues)
    const gravityForce = new THREE.Vector3(0, -PHYSICS_CONSTANTS.GRAVITY * mass, 0);

    // Thrust (in drone's local up direction)
    const thrustMagnitude = this.calculateThrust(throttle);
    const thrustDirection = new THREE.Vector3(0, 1, 0).applyQuaternion(state.quaternion);
    const thrustForce = thrustDirection.multiplyScalar(thrustMagnitude);

    // Wind
    const windVelocity = this.calculateWindVelocity(time, state.position).clone();

    // Aerodynamic drag
    const dragForce = this.calculateDrag(state.velocity, windVelocity).clone();

    // Total force
    const totalForce = new THREE.Vector3()
      .add(gravityForce)
      .add(thrustForce)
      .add(dragForce);

    // --- Calculate Angular Motion with Inertia ---

    // Desired angular velocity from stick input (rad/s)
    const desiredAngularVel = new THREE.Vector3(pitchRate, yawRate, -rollRate);

    // Calculate effective inertia factor based on mass
    // This creates a normalized feel where heavier quads feel more sluggish
    // but doesn't cause numerical instability with tiny masses
    // Scale: 25g whoop = 0.3, 650g 5" = 1.0, 2.5kg X-class = 2.5
    const inertiaFactor = 0.3 + (mass / 0.65) * 0.7;

    // Calculate angular acceleration
    // The error between desired and current angular velocity drives acceleration
    const angularError = new THREE.Vector3().subVectors(desiredAngularVel, state.angularVelocity);

    // Motor authority - how quickly motors can change angular velocity
    // Scaled by responsiveness setting and inversely by inertia
    const motorAuthority = this.specs.responsiveness / inertiaFactor;

    // Angular acceleration from motor torque
    const angularAccel = angularError.clone().multiplyScalar(motorAuthority);

    // Apply angular drag (air resistance to rotation)
    // Higher drag = rotation stops faster when stick is released
    const dragAccel = state.angularVelocity.clone().multiplyScalar(-this.specs.angularDrag / inertiaFactor);
    angularAccel.add(dragAccel);

    // Clamp acceleration to prevent instability
    const maxAccel = 100; // rad/s²
    if (angularAccel.length() > maxAccel) {
      angularAccel.normalize().multiplyScalar(maxAccel);
    }

    // Integrate angular velocity
    const newAngularVelocity = state.angularVelocity.clone().addScaledVector(angularAccel, dt);

    // Clamp angular velocity (max ~1800 deg/s)
    const maxAngularSpeed = 30; // rad/s
    if (newAngularVelocity.length() > maxAngularSpeed) {
      newAngularVelocity.normalize().multiplyScalar(maxAngularSpeed);
    }

    // --- Integration ---

    // Linear motion (semi-implicit Euler)
    const acceleration = totalForce.divideScalar(mass);
    const newVelocity = state.velocity.clone().addScaledVector(acceleration, dt);
    const newPosition = state.position.clone().addScaledVector(newVelocity, dt);

    // Quaternion integration using angular velocity
    // Create rotation quaternion from angular velocity
    const angularSpeed = newAngularVelocity.length();
    let newQuaternion: THREE.Quaternion;

    if (angularSpeed > 0.0001) {
      const axis = newAngularVelocity.clone().normalize();
      const angle = angularSpeed * dt;
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      newQuaternion = state.quaternion.clone().multiply(deltaQuat).normalize();
    } else {
      newQuaternion = state.quaternion.clone();
    }

    // --- Ground Collision ---
    const groundHeight = 0.05; // Drone center height when landed
    if (newPosition.y < groundHeight) {
      newPosition.y = groundHeight;

      // Cancel downward velocity and add ground friction
      if (newVelocity.y < 0) {
        newVelocity.y = 0;
      }

      // Ground friction
      newVelocity.x *= 0.95;
      newVelocity.z *= 0.95;

      // Dampen angular velocity when on ground
      newAngularVelocity.multiplyScalar(0.9);
    }

    // NaN safety check - reset to initial state if NaN detected
    if (isNaN(newPosition.x) || isNaN(newVelocity.x) || isNaN(newQuaternion.x)) {
      console.warn('NaN detected in physics, resetting state');
      return DronePhysicsEngine.createInitialState();
    }

    return {
      position: newPosition,
      velocity: newVelocity,
      quaternion: newQuaternion,
      angularVelocity: newAngularVelocity,
    };
  }

  /**
   * Create initial physics state
   */
  static createInitialState(position?: THREE.Vector3): PhysicsState {
    return {
      position: position?.clone() || new THREE.Vector3(0, 2, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0),
    };
  }

  /**
   * Get current wind config
   */
  getWindConfig(): WindConfig {
    return { ...this.windConfig, direction: this.windConfig.direction.clone() };
  }

  /**
   * Get drone specs
   */
  getSpecs(): DroneSpecs {
    return { ...this.specs };
  }
}

// Singleton instance for easy access
export const dronePhysics = new DronePhysicsEngine();
