
import { Rates, Calibration, ChannelMap, WindSettings, DronePhysicsSettings, DronePresetType } from './types';

export const GRAVITY = 9.81;
export const DRAG = 0.5; // Air resistance
export const ANGULAR_DRAG = 2.0;
export const THRUST_POWER = 35.0; // Power to weight ratio essentially
export const DRONE_MASS = 0.5; // kg
export const TIMESTEP = 1 / 60;

export const DEFAULT_RATES: Rates = {
  roll: {
    rcRate: 1.0,
    superRate: 0.7,
    expo: 0.2,
  },
  pitch: {
    rcRate: 1.0,
    superRate: 0.7,
    expo: 0.2,
  },
  yaw: {
    rcRate: 1.0,
    superRate: 0.7,
    expo: 0.2,
  },
};

export const DEFAULT_CALIBRATION: Calibration = {
  throttle: { min: -1, max: 1, center: 0, inverted: false },
  yaw: { min: -1, max: 1, center: 0, inverted: false },
  pitch: { min: -1, max: 1, center: 0, inverted: false },
  roll: { min: -1, max: 1, center: 0, inverted: false },
};

// Map gamepad axes to Mode 2 (Left stick throttle/yaw, Right stick pitch/roll)
// These indices might vary by controller, but this is a common standard (Xbox/PS)
export const AXIS_MAP = {
  THROTTLE: 1, // Left Stick Y
  YAW: 0,      // Left Stick X
  PITCH: 3,    // Right Stick Y
  ROLL: 2,     // Right Stick X
};

// Default channel mapping for Gamepad (Mode 2 - standard Xbox/PS layout)
// Axis 0: Left Stick X (Yaw)
// Axis 1: Left Stick Y (Throttle)
// Axis 2: Right Stick X (Roll)
// Axis 3: Right Stick Y (Pitch)
export const DEFAULT_CHANNEL_MAP: ChannelMap = {
  yaw: 0,      // Left Stick X
  throttle: 1, // Left Stick Y
  roll: 2,     // Right Stick X
  pitch: 3,    // Right Stick Y
};

// Default channel mapping for WebHID/Radio controllers
// AETR order (Aileron=Roll, Elevator=Pitch, Throttle, Rudder=Yaw) is common
export const DEFAULT_HID_CHANNEL_MAP: ChannelMap = {
  roll: 0,     // CH1 - Aileron
  pitch: 1,    // CH2 - Elevator
  throttle: 2, // CH3 - Throttle
  yaw: 3,      // CH4 - Rudder
};

// Default wind settings (disabled by default)
export const DEFAULT_WIND_SETTINGS: WindSettings = {
  enabled: false,
  baseSpeed: 0,           // m/s
  directionAngle: 0,      // degrees (0 = North/+Z direction)
  gustStrength: 0,        // m/s
  gustFrequency: 0.5,     // Hz
  turbulenceScale: 0,     // 0-1
};

// Drone physics presets
// Values: mass (kg), maxThrust per motor (N), dragCoefficient, angularDrag, responsiveness
export const DRONE_PRESETS: Record<DronePresetType, Omit<DronePhysicsSettings, 'preset'>> = {
  'WHOOP_65MM': {
    mass: 0.025,          // 25g
    maxThrust: 0.15,      // ~15g thrust per motor
    dragCoefficient: 0.8,
    angularDrag: 5.0,     // Whoops feel more dampened
    responsiveness: 8,
  },
  'WHOOP_75MM': {
    mass: 0.035,          // 35g
    maxThrust: 0.25,      // ~25g thrust per motor
    dragCoefficient: 0.9,
    angularDrag: 4.5,
    responsiveness: 9,
  },
  'TOOTHPICK_3IN': {
    mass: 0.080,          // 80g
    maxThrust: 1.2,       // ~120g thrust per motor
    dragCoefficient: 0.6,
    angularDrag: 3.5,
    responsiveness: 12,
  },
  'FREESTYLE_5IN': {
    mass: 0.650,          // 650g
    maxThrust: 4.5,       // ~450g thrust per motor
    dragCoefficient: 1.0,
    angularDrag: 3.0,
    responsiveness: 12,
  },
  'RACE_5IN': {
    mass: 0.450,          // 450g (lighter race build)
    maxThrust: 5.5,       // ~550g thrust per motor (more aggressive)
    dragCoefficient: 0.8,
    angularDrag: 2.0,     // Less drag = faster flips
    responsiveness: 18,   // Very snappy
  },
  'CINEWHOOP': {
    mass: 0.350,          // 350g with duct guards
    maxThrust: 2.5,       // ~250g thrust per motor
    dragCoefficient: 1.5, // Ducts add drag
    angularDrag: 4.0,     // More stable for filming
    responsiveness: 8,    // Smoother for cinema
  },
  'LONG_RANGE_7IN': {
    mass: 0.900,          // 900g
    maxThrust: 6.0,       // ~600g thrust per motor
    dragCoefficient: 0.9,
    angularDrag: 3.5,
    responsiveness: 10,
  },
  'X_CLASS_10IN': {
    mass: 2.5,            // 2.5kg
    maxThrust: 15.0,      // ~1.5kg thrust per motor
    dragCoefficient: 1.2,
    angularDrag: 4.0,
    responsiveness: 8,    // Heavy = slower response
  },
  'CUSTOM': {
    mass: 0.650,
    maxThrust: 4.5,
    dragCoefficient: 1.0,
    angularDrag: 3.0,
    responsiveness: 12,
  },
};

// Default drone physics (5" freestyle)
export const DEFAULT_DRONE_PHYSICS: DronePhysicsSettings = {
  preset: 'FREESTYLE_5IN',
  ...DRONE_PRESETS['FREESTYLE_5IN'],
};
