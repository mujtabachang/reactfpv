import { RateProfile } from '../types';

// Helper to calculate Betaflight-style rates
// Returns degrees per second
export const calculateRate = (input: number, rateProfile: RateProfile): number => {
  const { rcRate, superRate, expo } = rateProfile;
  
  // Constrain input
  const rcCommand = Math.max(-1, Math.min(1, input));

  // Expo
  const absRcCommand = Math.abs(rcCommand);
  const rcCommandExp = rcCommand * Math.pow(absRcCommand, 3) * expo + rcCommand * (1 - expo);

  // Rate calculation
  // Betaflight formula approximation
  // Max deg/s = 200 * rcRate / (1 - superRate)
  // This is a simplified version of the actual BF code but sufficient for sims
  
  // Avoid division by zero
  const SR = Math.min(superRate, 0.99);
  
  const currentAngleRate = 200 * rcRate * rcCommandExp;
  const rateEffect = 1.0 / (1.0 - (Math.abs(rcCommand) * SR));
  
  return currentAngleRate * rateEffect;
};

// Physics utils
export const applyDeadband = (value: number, deadband: number = 0.05): number => {
  if (Math.abs(value) < deadband) return 0;
  // Rescale remaining range
  return (value - (value > 0 ? deadband : -deadband)) / (1 - deadband);
};
