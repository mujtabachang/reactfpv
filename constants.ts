
import { Rates, Calibration } from './types';

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
