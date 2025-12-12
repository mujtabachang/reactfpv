
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface RateProfile {
  rcRate: number;
  superRate: number;
  expo: number;
}

export interface Rates {
  roll: RateProfile;
  pitch: RateProfile;
  yaw: RateProfile;
}

export interface AxisCalibration {
  min: number;
  max: number;
  center: number;
  inverted: boolean;
}

export interface Calibration {
  throttle: AxisCalibration;
  yaw: AxisCalibration;
  pitch: AxisCalibration;
  roll: AxisCalibration;
}

export interface PhysicsState {
  position: Vector3;
  velocity: Vector3;
  rotation: Quaternion; // We will use Three.js Quaternion internally, but this shape is useful
  angularVelocity: Vector3;
}

export interface GamepadState {
  throttle: number; // 0 to 1
  yaw: number;      // -1 to 1
  pitch: number;    // -1 to 1
  roll: number;     // -1 to 1
  isConnected: boolean;
}

export type InputMode = 'GAMEPAD' | 'KEYBOARD' | 'WEBHID';

export type CameraMode = 'FPV' | 'THIRD_PERSON' | 'LOS';

// Channel mapping - which input channel maps to which control
export interface ChannelMap {
  throttle: number; // Channel index (0-7)
  yaw: number;
  pitch: number;
  roll: number;
}

// Wind configuration for physics simulation
export interface WindSettings {
  enabled: boolean;
  baseSpeed: number;        // m/s - constant wind speed (0-20)
  directionAngle: number;   // degrees - wind direction (0-360, 0 = North/+Z)
  gustStrength: number;     // m/s - additional gust magnitude (0-10)
  gustFrequency: number;    // Hz - how often gusts occur (0-2)
  turbulenceScale: number;  // 0-1 - intensity of random turbulence
}

// Drone physics settings
export type DronePresetType = 'WHOOP_65MM' | 'WHOOP_75MM' | 'TOOTHPICK_3IN' | 'FREESTYLE_5IN' | 'RACE_5IN' | 'CINEWHOOP' | 'LONG_RANGE_7IN' | 'X_CLASS_10IN' | 'CUSTOM';

export interface DronePhysicsSettings {
  preset: DronePresetType;
  mass: number;              // kg
  maxThrust: number;         // N per motor
  dragCoefficient: number;   // 0-2
  angularDrag: number;       // 0-10 (how fast rotation stops)
  responsiveness: number;    // 1-20 (how snappy controls feel)
}
