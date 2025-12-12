
import { Rates, Calibration, ChannelMap, WindSettings } from './types';

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
