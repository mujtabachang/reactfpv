
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

export type InputMode = 'GAMEPAD' | 'KEYBOARD';

export type CameraMode = 'FPV' | 'THIRD_PERSON' | 'LOS';
