
import { AxisCalibration } from '../types';

/**
 * Normalizes a raw axis input based on calibration data.
 * Returns a value between -1 and 1.
 */
export const normalizeInput = (raw: number, calibration: AxisCalibration): number => {
    let value = raw;
    const { min, max, center, inverted } = calibration;
    
    let normalized = 0;

    // Piecewise linear interpolation to ensure center is exactly 0
    if (value > center) {
        // Map [center, max] to [0, 1]
        if (Math.abs(max - center) < 0.001) normalized = 0; 
        else normalized = (value - center) / (max - center);
    } else {
        // Map [min, center] to [-1, 0]
        if (Math.abs(center - min) < 0.001) normalized = 0;
        else normalized = -(center - value) / (center - min);
    }
    
    // Clamp to -1 to 1
    normalized = Math.max(-1, Math.min(1, normalized));

    return inverted ? -normalized : normalized;
}
