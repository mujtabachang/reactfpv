
import React, { useState, useEffect, useRef } from 'react';
import { Rates, RateProfile, InputMode, Calibration, CameraMode, ChannelMap, WindSettings, DronePhysicsSettings, DronePresetType } from '../types';
import { DRONE_PRESETS } from '../constants';
import { X, Gamepad2, Keyboard, Camera, Tv, Crosshair, Eye, User, Video, Usb, Shuffle, Wind, CloudRain, Plane } from 'lucide-react';

// Helper to get wind direction label from angle
const getWindDirectionLabel = (angle: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
};

interface SettingsPanelProps {
  rates: Rates;
  setRates: (rates: Rates) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  cameraTilt: number;
  setCameraTilt: (tilt: number) => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  analogStatic: boolean;
  setAnalogStatic: (enabled: boolean) => void;
  calibration: Calibration;
  setCalibration: (cal: Calibration) => void;
  channelMap: ChannelMap;
  setChannelMap: (map: ChannelMap) => void;
  hidChannels: number[];
  gamepadAxes: number[];
  windSettings: WindSettings;
  setWindSettings: (settings: WindSettings) => void;
  dronePhysics: DronePhysicsSettings;
  setDronePhysics: (settings: DronePhysicsSettings) => void;
  onClose: () => void;
}

// Preset display names
const PRESET_NAMES: Record<DronePresetType, string> = {
  'WHOOP_65MM': '65mm Whoop',
  'WHOOP_75MM': '75mm Whoop',
  'TOOTHPICK_3IN': '3" Toothpick',
  'FREESTYLE_5IN': '5" Freestyle',
  'RACE_5IN': '5" Race',
  'CINEWHOOP': 'Cinewhoop',
  'LONG_RANGE_7IN': '7" Long Range',
  'X_CLASS_10IN': '10" X-Class',
  'CUSTOM': 'Custom',
};

const RateRow = ({ 
  label, 
  profile, 
  onChange 
}: { 
  label: string; 
  profile: RateProfile; 
  onChange: (p: RateProfile) => void 
}) => {
  const handleChange = (key: keyof RateProfile, value: number) => {
    onChange({ ...profile, [key]: parseFloat(value.toFixed(2)) });
  };

  const maxVel = (200 * profile.rcRate * (1 / (1 - Math.min(profile.superRate, 0.99)))).toFixed(0);

  return (
    <div className="mb-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-white uppercase">{label}</h3>
        <span className="text-xs text-gray-400">Max Vel: {maxVel} deg/s</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">RC Rate ({profile.rcRate})</label>
          <input
            type="range"
            min="0.1"
            max="2.5"
            step="0.05"
            value={profile.rcRate}
            onChange={(e) => handleChange('rcRate', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Super Rate ({profile.superRate})</label>
          <input
            type="range"
            min="0.0"
            max="0.95"
            step="0.01"
            value={profile.superRate}
            onChange={(e) => handleChange('superRate', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Expo ({profile.expo})</label>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={profile.expo}
            onChange={(e) => handleChange('expo', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

// WebHID Calibration Modal
const HIDCalibrationModal = ({
  currentCalibration,
  channelMap,
  hidChannels,
  onSave,
  onCancel
}: {
  currentCalibration: Calibration;
  channelMap: ChannelMap;
  hidChannels: number[];
  onSave: (c: Calibration) => void;
  onCancel: () => void;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [tempCal, setTempCal] = useState<Calibration>(currentCalibration);

  // Get current values based on channel map
  const getCurrentValues = () => ({
    roll: hidChannels[channelMap.roll] ?? 0,
    pitch: hidChannels[channelMap.pitch] ?? 0,
    throttle: hidChannels[channelMap.throttle] ?? 0,
    yaw: hidChannels[channelMap.yaw] ?? 0,
  });

  // Auto-expand limits in step 2
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        const values = getCurrentValues();
        setTempCal(prev => ({
          roll: { ...prev.roll, min: Math.min(prev.roll.min, values.roll), max: Math.max(prev.roll.max, values.roll) },
          pitch: { ...prev.pitch, min: Math.min(prev.pitch.min, values.pitch), max: Math.max(prev.pitch.max, values.pitch) },
          throttle: { ...prev.throttle, min: Math.min(prev.throttle.min, values.throttle), max: Math.max(prev.throttle.max, values.throttle) },
          yaw: { ...prev.yaw, min: Math.min(prev.yaw.min, values.yaw), max: Math.max(prev.yaw.max, values.yaw) },
        }));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step, hidChannels, channelMap]);

  const captureCenter = () => {
    const values = getCurrentValues();
    setTempCal({
      roll: { ...tempCal.roll, center: values.roll, min: values.roll, max: values.roll },
      pitch: { ...tempCal.pitch, center: values.pitch, min: values.pitch, max: values.pitch },
      throttle: { ...tempCal.throttle, center: values.throttle, min: values.throttle, max: values.throttle },
      yaw: { ...tempCal.yaw, center: values.yaw, min: values.yaw, max: values.yaw },
    });
    setStep(2);
  };

  const values = getCurrentValues();

  const AxisBar = ({ label, value, min, max, center }: { label: string; value: number; min?: number; max?: number; center?: number }) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(3)}</span>
      </div>
      <div className="h-4 bg-gray-700 rounded-full relative overflow-hidden">
        {center !== undefined && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{ left: `${(center + 1) / 2 * 100}%` }} />
        )}
        {min !== undefined && max !== undefined && (
          <div className="absolute top-1 bottom-1 bg-gray-600 z-0" style={{ left: `${(min + 1) / 2 * 100}%`, right: `${100 - (max + 1) / 2 * 100}%` }} />
        )}
        <div className="absolute top-0 bottom-0 w-1 bg-orange-500 z-20 transition-all duration-75" style={{ left: `${(value + 1) / 2 * 100}%` }} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold text-white mb-4">Radio Calibration</h2>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg text-blue-300 text-sm">
              <strong>Step 1:</strong> Center your Pitch, Roll, and Yaw sticks. Place Throttle at its lowest position (or middle if spring-centered).
            </div>
            <div className="py-4">
              <AxisBar label={`Roll (CH${channelMap.roll + 1})`} value={values.roll} />
              <AxisBar label={`Pitch (CH${channelMap.pitch + 1})`} value={values.pitch} />
              <AxisBar label={`Throttle (CH${channelMap.throttle + 1})`} value={values.throttle} />
              <AxisBar label={`Yaw (CH${channelMap.yaw + 1})`} value={values.yaw} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={captureCenter} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold">Capture Center</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-green-300 text-sm">
              <strong>Step 2:</strong> Move all sticks to their full extents. Push throttle to max and min. Move roll/pitch/yaw to all corners.
            </div>
            <div className="py-4">
              <AxisBar label="Roll" value={values.roll} min={tempCal.roll.min} max={tempCal.roll.max} center={tempCal.roll.center} />
              <AxisBar label="Pitch" value={values.pitch} min={tempCal.pitch.min} max={tempCal.pitch.max} center={tempCal.pitch.center} />
              <AxisBar label="Throttle" value={values.throttle} min={tempCal.throttle.min} max={tempCal.throttle.max} center={tempCal.throttle.center} />
              <AxisBar label="Yaw" value={values.yaw} min={tempCal.yaw.min} max={tempCal.yaw.max} center={tempCal.yaw.center} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-400 hover:text-white">Back</button>
              <button onClick={() => onSave(tempCal)} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-bold">Finish & Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Gamepad Calibration Modal
const CalibrationModal = ({ currentCalibration, channelMap, onSave, onCancel }: { currentCalibration: Calibration, channelMap: ChannelMap, onSave: (c: Calibration) => void, onCancel: () => void }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [tempCal, setTempCal] = useState<Calibration>(currentCalibration);
    const [rawAxes, setRawAxes] = useState<number[]>([0,0,0,0]);
    const requestRef = useRef<number>(0);

    // Poll gamepad for the UI visualization using channelMap
    const updateLoop = () => {
        const gp = navigator.getGamepads()[0] || navigator.getGamepads()[1];
        if (gp) {
            const axes = [
                gp.axes[channelMap.yaw] ?? 0,
                gp.axes[channelMap.throttle] ?? 0,
                gp.axes[channelMap.roll] ?? 0,
                gp.axes[channelMap.pitch] ?? 0
            ];
            setRawAxes(axes);

            if (step === 2) {
                // Auto expand limits
                setTempCal(prev => {
                    const next = { ...prev };

                    // Helper to update min/max
                    const updateAxis = (key: keyof Calibration, rawVal: number) => {
                        next[key] = {
                            ...next[key],
                            min: Math.min(next[key].min, rawVal),
                            max: Math.max(next[key].max, rawVal)
                        }
                    };

                    updateAxis('yaw', gp.axes[channelMap.yaw] ?? 0);
                    updateAxis('throttle', gp.axes[channelMap.throttle] ?? 0);
                    updateAxis('roll', gp.axes[channelMap.roll] ?? 0);
                    updateAxis('pitch', gp.axes[channelMap.pitch] ?? 0);
                    return next;
                });
            }
        }
        requestRef.current = requestAnimationFrame(updateLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateLoop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [step, channelMap]);

    const captureCenter = () => {
        const gp = navigator.getGamepads()[0] || navigator.getGamepads()[1];
        if (!gp) return;

        const yawVal = gp.axes[channelMap.yaw] ?? 0;
        const throttleVal = gp.axes[channelMap.throttle] ?? 0;
        const rollVal = gp.axes[channelMap.roll] ?? 0;
        const pitchVal = gp.axes[channelMap.pitch] ?? 0;

        setTempCal({
            yaw: { ...tempCal.yaw, center: yawVal, min: yawVal, max: yawVal },
            throttle: { ...tempCal.throttle, center: throttleVal, min: throttleVal, max: throttleVal },
            roll: { ...tempCal.roll, center: rollVal, min: rollVal, max: rollVal },
            pitch: { ...tempCal.pitch, center: pitchVal, min: pitchVal, max: pitchVal },
        });
        setStep(2);
    };

    const finish = () => {
        onSave(tempCal);
    };

    const AxisBar = ({ label, value, min, max, center }: { label: string, value: number, min?: number, max?: number, center?: number }) => (
        <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{label}</span>
                <span className="font-mono">{value.toFixed(2)}</span>
            </div>
            <div className="h-4 bg-gray-700 rounded-full relative overflow-hidden">
                {/* Center Marker */}
                {center !== undefined && (
                     <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10" style={{ left: `${(center + 1) / 2 * 100}%` }}></div>
                )}
                {/* Min/Max Range */}
                {min !== undefined && max !== undefined && (
                     <div className="absolute top-1 bottom-1 bg-gray-600 z-0" style={{ left: `${(min + 1) / 2 * 100}%`, right: `${100 - (max + 1) / 2 * 100}%` }}></div>
                )}
                {/* Current Value Cursor */}
                <div className="absolute top-0 bottom-0 w-1 bg-orange-500 z-20 transition-all duration-75" style={{ left: `${(value + 1) / 2 * 100}%` }}></div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-lg w-full">
                <h2 className="text-xl font-bold text-white mb-4">Controller Calibration</h2>
                
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg text-blue-300 text-sm">
                            <strong>Step 1:</strong> Center your Pitch, Roll, and Yaw sticks. Place Throttle in the middle.
                        </div>
                        <div className="py-4">
                             <AxisBar label="Yaw (Left X)" value={rawAxes[0]} />
                             <AxisBar label="Throttle (Left Y)" value={rawAxes[1]} />
                             <AxisBar label="Roll (Right X)" value={rawAxes[2]} />
                             <AxisBar label="Pitch (Right Y)" value={rawAxes[3]} />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={captureCenter} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold">Capture Center</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-green-300 text-sm">
                            <strong>Step 2:</strong> Move all sticks in circles to reach their physical limits. Ensure corners are reached.
                        </div>
                        <div className="py-4">
                             <AxisBar label="Yaw" value={rawAxes[0]} min={tempCal.yaw.min} max={tempCal.yaw.max} center={tempCal.yaw.center} />
                             <AxisBar label="Throttle" value={rawAxes[1]} min={tempCal.throttle.min} max={tempCal.throttle.max} center={tempCal.throttle.center} />
                             <AxisBar label="Roll" value={rawAxes[2]} min={tempCal.roll.min} max={tempCal.roll.max} center={tempCal.roll.center} />
                             <AxisBar label="Pitch" value={rawAxes[3]} min={tempCal.pitch.min} max={tempCal.pitch.max} center={tempCal.pitch.center} />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-400 hover:text-white">Back</button>
                            <button onClick={finish} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-bold">Finish & Save</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    rates,
    setRates,
    inputMode,
    setInputMode,
    cameraTilt,
    setCameraTilt,
    cameraMode,
    setCameraMode,
    analogStatic,
    setAnalogStatic,
    calibration,
    setCalibration,
    channelMap,
    setChannelMap,
    hidChannels,
    gamepadAxes,
    windSettings,
    setWindSettings,
    dronePhysics,
    setDronePhysics,
    onClose
}) => {
  const [showCalibration, setShowCalibration] = useState(false);
  const [showHIDCalibration, setShowHIDCalibration] = useState(false);
  const updateRate = (axis: keyof Rates, newProfile: RateProfile) => {
    setRates({ ...rates, [axis]: newProfile });
  };

  const toggleInvert = (axis: keyof Calibration) => {
      setCalibration({
          ...calibration,
          [axis]: { ...calibration[axis], inverted: !calibration[axis].inverted }
      });
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {showCalibration && (
          <CalibrationModal
            currentCalibration={calibration}
            channelMap={channelMap}
            onSave={(newCal) => { setCalibration(newCal); setShowCalibration(false); }}
            onCancel={() => setShowCalibration(false)}
          />
      )}
      {showHIDCalibration && (
          <HIDCalibrationModal
            currentCalibration={calibration}
            channelMap={channelMap}
            hidChannels={hidChannels}
            onSave={(newCal) => { setCalibration(newCal); setShowHIDCalibration(false); }}
            onCancel={() => setShowHIDCalibration(false)}
          />
      )}

      <div className="bg-gray-900 w-full max-w-2xl rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h2 className="text-xl font-bold text-white">Drone Tuning</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {/* General Settings */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
             <h3 className="font-bold text-white uppercase mb-3">General</h3>
             <div className="flex flex-col gap-4">
                 {/* Input Type */}
                 <div>
                    <label className="block text-xs text-gray-400 mb-2">Input Mode</label>
                    <div className="flex gap-2">
                        <button
                        onClick={() => setInputMode('WEBHID')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${inputMode === 'WEBHID' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                        <Usb size={20} />
                        <span className="font-bold text-sm">Radio (USB)</span>
                        </button>
                        <button
                        onClick={() => setInputMode('GAMEPAD')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${inputMode === 'GAMEPAD' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                        <Gamepad2 size={20} />
                        <span className="font-bold text-sm">Gamepad</span>
                        </button>
                        <button
                        onClick={() => setInputMode('KEYBOARD')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${inputMode === 'KEYBOARD' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                        <Keyboard size={20} />
                        <span className="font-bold text-sm">Keyboard</span>
                        </button>
                    </div>
                 </div>

                 {/* Camera Settings */}
                 <div>
                    <label className="block text-xs text-gray-400 mb-2">Camera Mode</label>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCameraMode('FPV')}
                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${cameraMode === 'FPV' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                        >
                            <Video size={16} /> <span className="text-xs font-bold">FPV</span>
                        </button>
                        <button 
                            onClick={() => setCameraMode('THIRD_PERSON')}
                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${cameraMode === 'THIRD_PERSON' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                        >
                            <User size={16} /> <span className="text-xs font-bold">3rd Person</span>
                        </button>
                        <button 
                            onClick={() => setCameraMode('LOS')}
                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${cameraMode === 'LOS' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                        >
                            <Eye size={16} /> <span className="text-xs font-bold">LOS (Static)</span>
                        </button>
                    </div>
                 </div>

                 <div className="flex gap-4">
                     {/* Camera Tilt - Only relevant for FPV */}
                     <div className={`flex-1 transition-opacity ${cameraMode !== 'FPV' ? 'opacity-50 pointer-events-none' : ''}`}>
                         <div className="flex justify-between mb-1">
                            <label className="block text-xs text-gray-400 flex items-center gap-1"><Camera size={14}/> FPV Tilt</label>
                            <span className="text-xs font-mono font-bold text-orange-400">{cameraTilt}°</span>
                         </div>
                         <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={cameraTilt}
                            onChange={(e) => setCameraTilt(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>

                     {/* Analog Static Toggle */}
                     <div className={`flex-1 flex flex-col justify-between ${cameraMode !== 'FPV' ? 'opacity-50 pointer-events-none' : ''}`}>
                         <label className="block text-xs text-gray-400 flex items-center gap-1 mb-1"><Tv size={14}/> Analog Static</label>
                         <button 
                            onClick={() => setAnalogStatic(!analogStatic)}
                            className={`w-full py-2 rounded-lg font-bold text-sm transition-colors border ${analogStatic ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'}`}
                         >
                             {analogStatic ? 'ENABLED' : 'DISABLED'}
                         </button>
                     </div>
                 </div>
             </div>
          </div>

          {/* Controller Calibration Section */}
          {(inputMode === 'GAMEPAD' || inputMode === 'WEBHID') && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-white uppercase mb-3 flex items-center gap-2"><Crosshair size={18}/> Controller Mapping</h3>
                  <div className="flex flex-col gap-4">
                      {/* Channel Mapping for Gamepad */}
                      {inputMode === 'GAMEPAD' && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowCalibration(true)}
                            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <Crosshair size={18} />
                            Calibrate Sticks (Min/Max/Center)
                          </button>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <Shuffle size={14} />
                            <span>Axis Mapping</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {(['roll', 'pitch', 'throttle', 'yaw'] as const).map((control) => {
                              const axisIndex = channelMap[control];
                              const axisValue = gamepadAxes[axisIndex] ?? 0;
                              const displayValue = control === 'throttle'
                                ? ((axisValue * -1 + 1) / 2 * 100).toFixed(0) // Throttle: up (-1) = 100%
                                : (axisValue * 100).toFixed(0);
                              return (
                                <div key={control} className="bg-gray-900/50 p-3 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-300 capitalize font-medium">{control}</span>
                                    <span className="text-xs font-mono text-orange-400">{displayValue}%</span>
                                  </div>
                                  <select
                                    value={axisIndex}
                                    onChange={(e) => setChannelMap({ ...channelMap, [control]: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none"
                                  >
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((axis) => (
                                      <option key={axis} value={axis}>Axis {axis}</option>
                                    ))}
                                  </select>
                                  {/* Live axis bar */}
                                  <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500 transition-all duration-75"
                                      style={{ width: `${Math.abs(axisValue) * 50 + 50}%`, marginLeft: axisValue < 0 ? `${50 + axisValue * 50}%` : '50%' }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Channel Mapping for WebHID */}
                      {inputMode === 'WEBHID' && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowHIDCalibration(true)}
                            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <Crosshair size={18} />
                            Calibrate Sticks (Min/Max/Center)
                          </button>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <Shuffle size={14} />
                            <span>Channel Mapping (AETR, TAER, etc.)</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {(['roll', 'pitch', 'throttle', 'yaw'] as const).map((control) => {
                              const channelIndex = channelMap[control];
                              const channelValue = hidChannels[channelIndex] ?? 0;
                              const displayValue = control === 'throttle'
                                ? ((channelValue + 1) / 2 * 100).toFixed(0)
                                : (channelValue * 100).toFixed(0);
                              return (
                                <div key={control} className="bg-gray-900/50 p-3 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-300 capitalize font-medium">{control}</span>
                                    <span className="text-xs font-mono text-orange-400">{displayValue}%</span>
                                  </div>
                                  <select
                                    value={channelIndex}
                                    onChange={(e) => setChannelMap({ ...channelMap, [control]: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:border-orange-500 focus:outline-none"
                                  >
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((ch) => (
                                      <option key={ch} value={ch}>CH{ch + 1}</option>
                                    ))}
                                  </select>
                                  {/* Live channel bar */}
                                  <div className="h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div
                                      className="h-full bg-orange-500 transition-all duration-75"
                                      style={{ width: `${Math.abs(channelValue) * 50 + 50}%`, marginLeft: channelValue < 0 ? `${50 + channelValue * 50}%` : '50%' }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          {['Throttle', 'Yaw', 'Pitch', 'Roll'].map((axis) => {
                              const key = axis.toLowerCase() as keyof Calibration;
                              return (
                                <div key={axis} className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                                    <span className="text-sm text-gray-300">{axis}</span>
                                    <button
                                        onClick={() => toggleInvert(key)}
                                        className={`text-xs px-2 py-1 rounded border ${calibration[key].inverted ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-gray-700 text-gray-400 border-gray-600'}`}
                                    >
                                        {calibration[key].inverted ? 'INVERTED' : 'NORMAL'}
                                    </button>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          )}

          {/* Drone Physics Settings */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-bold text-white uppercase mb-3 flex items-center gap-2"><Plane size={18}/> Quad Physics</h3>
            <div className="flex flex-col gap-4">
              {/* Preset Selection */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Quad Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DRONE_PRESETS) as DronePresetType[]).filter(p => p !== 'CUSTOM').map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setDronePhysics({
                          preset,
                          ...DRONE_PRESETS[preset]
                        });
                      }}
                      className={`px-2 py-2 text-xs rounded border transition-colors ${
                        dronePhysics.preset === preset
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {PRESET_NAMES[preset]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Settings */}
              <div className="space-y-3 pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Custom Tuning</span>
                  {dronePhysics.preset !== 'CUSTOM' && (
                    <span className="text-xs text-gray-500">(Modifying will switch to Custom)</span>
                  )}
                </div>

                {/* Mass */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Mass</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{(dronePhysics.mass * 1000).toFixed(0)}g</span>
                  </div>
                  <input
                    type="range"
                    min="0.020"
                    max="3.0"
                    step="0.005"
                    value={dronePhysics.mass}
                    onChange={(e) => setDronePhysics({ ...dronePhysics, preset: 'CUSTOM', mass: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Max Thrust */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Max Thrust (per motor)</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{dronePhysics.maxThrust.toFixed(1)}N (~{(dronePhysics.maxThrust * 100).toFixed(0)}g)</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={dronePhysics.maxThrust}
                    onChange={(e) => setDronePhysics({ ...dronePhysics, preset: 'CUSTOM', maxThrust: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Thrust to Weight Ratio Display */}
                <div className="bg-gray-900/50 p-2 rounded text-center">
                  <span className="text-xs text-gray-400">Thrust-to-Weight Ratio: </span>
                  <span className="text-sm font-bold text-green-400">
                    {((dronePhysics.maxThrust * 4) / (dronePhysics.mass * 9.81)).toFixed(1)}:1
                  </span>
                </div>

                {/* Responsiveness */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Responsiveness (Snappiness)</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{dronePhysics.responsiveness.toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={dronePhysics.responsiveness}
                    onChange={(e) => setDronePhysics({ ...dronePhysics, preset: 'CUSTOM', responsiveness: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Sluggish</span>
                    <span>Snappy</span>
                  </div>
                </div>

                {/* Angular Drag */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Angular Drag (Rotation Stop)</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{dronePhysics.angularDrag.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={dronePhysics.angularDrag}
                    onChange={(e) => setDronePhysics({ ...dronePhysics, preset: 'CUSTOM', angularDrag: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Floaty</span>
                    <span>Locked In</span>
                  </div>
                </div>

                {/* Drag Coefficient */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Air Drag</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{dronePhysics.dragCoefficient.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={dronePhysics.dragCoefficient}
                    onChange={(e) => setDronePhysics({ ...dronePhysics, preset: 'CUSTOM', dragCoefficient: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wind Settings */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-bold text-white uppercase mb-3 flex items-center gap-2"><Wind size={18}/> Wind Simulation</h3>
            <div className="flex flex-col gap-4">
              {/* Wind Enable Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Enable Wind</span>
                <button
                  onClick={() => setWindSettings({ ...windSettings, enabled: !windSettings.enabled })}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${windSettings.enabled ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'}`}
                >
                  {windSettings.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className={`space-y-4 transition-opacity ${!windSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Base Wind Speed */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Base Wind Speed</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{windSettings.baseSpeed.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={windSettings.baseSpeed}
                    onChange={(e) => setWindSettings({ ...windSettings, baseSpeed: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Calm</span>
                    <span>Light (5)</span>
                    <span>Strong (10)</span>
                    <span>Storm (20)</span>
                  </div>
                </div>

                {/* Wind Direction */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Wind Direction</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{windSettings.directionAngle}° ({getWindDirectionLabel(windSettings.directionAngle)})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="15"
                    value={windSettings.directionAngle}
                    onChange={(e) => setWindSettings({ ...windSettings, directionAngle: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Gust Strength */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400 flex items-center gap-1"><CloudRain size={12}/> Gust Strength</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{windSettings.gustStrength.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={windSettings.gustStrength}
                    onChange={(e) => setWindSettings({ ...windSettings, gustStrength: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Gust Frequency */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Gust Frequency</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{windSettings.gustFrequency.toFixed(2)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.05"
                    value={windSettings.gustFrequency}
                    onChange={(e) => setWindSettings({ ...windSettings, gustFrequency: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Turbulence */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-xs text-gray-400">Turbulence Intensity</label>
                    <span className="text-xs font-mono font-bold text-orange-400">{(windSettings.turbulenceScale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={windSettings.turbulenceScale}
                    onChange={(e) => setWindSettings({ ...windSettings, turbulenceScale: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>None</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-gray-700">
                  <label className="block text-xs text-gray-400 mb-2">Quick Presets</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setWindSettings({ ...windSettings, baseSpeed: 0, gustStrength: 0, turbulenceScale: 0 })}
                      className="px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    >
                      Calm
                    </button>
                    <button
                      onClick={() => setWindSettings({ ...windSettings, baseSpeed: 3, gustStrength: 1, turbulenceScale: 0.1 })}
                      className="px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setWindSettings({ ...windSettings, baseSpeed: 7, gustStrength: 3, turbulenceScale: 0.3 })}
                      className="px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    >
                      Moderate
                    </button>
                    <button
                      onClick={() => setWindSettings({ ...windSettings, baseSpeed: 15, gustStrength: 8, turbulenceScale: 0.7 })}
                      className="px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    >
                      Storm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <RateRow label="Roll Rates" profile={rates.roll} onChange={(p) => updateRate('roll', p)} />
          <RateRow label="Pitch Rates" profile={rates.pitch} onChange={(p) => updateRate('pitch', p)} />
          <RateRow label="Yaw Rates" profile={rates.yaw} onChange={(p) => updateRate('yaw', p)} />
          
          <div className="mt-6 text-sm text-gray-500 border-t border-gray-700 pt-4">
            <p className="mb-2"><strong className="text-gray-300">Controls:</strong></p>
             <ul className="list-disc pl-5 space-y-1">
                <li>Toggle Menu: <kbd className="bg-gray-700 px-1 rounded">M</kbd> or <kbd className="bg-gray-700 px-1 rounded">ESC</kbd></li>
                <li>Reset Position: <kbd className="bg-gray-700 px-1 rounded">R</kbd></li>
                <li>Change Camera: <kbd className="bg-gray-700 px-1 rounded">C</kbd></li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
