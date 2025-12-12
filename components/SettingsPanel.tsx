
import React, { useState, useEffect, useRef } from 'react';
import { Rates, RateProfile, InputMode, Calibration, CameraMode } from '../types';
import { X, Gamepad2, Keyboard, Camera, Tv, Crosshair, ArrowLeftRight, CheckCircle, Eye, User, Video } from 'lucide-react';
import { AXIS_MAP } from '../constants';

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
  onClose: () => void;
}

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

const CalibrationModal = ({ currentCalibration, onSave, onCancel }: { currentCalibration: Calibration, onSave: (c: Calibration) => void, onCancel: () => void }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [tempCal, setTempCal] = useState<Calibration>(currentCalibration);
    const [rawAxes, setRawAxes] = useState<number[]>([0,0,0,0]);
    const requestRef = useRef<number>(0);

    // Poll gamepad for the UI visualization
    const updateLoop = () => {
        const gp = navigator.getGamepads()[0] || navigator.getGamepads()[1];
        if (gp) {
            const axes = [
                gp.axes[AXIS_MAP.YAW],
                gp.axes[AXIS_MAP.THROTTLE],
                gp.axes[AXIS_MAP.ROLL],
                gp.axes[AXIS_MAP.PITCH]
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

                    updateAxis('yaw', gp.axes[AXIS_MAP.YAW]);
                    updateAxis('throttle', gp.axes[AXIS_MAP.THROTTLE]);
                    updateAxis('roll', gp.axes[AXIS_MAP.ROLL]);
                    updateAxis('pitch', gp.axes[AXIS_MAP.PITCH]);
                    return next;
                });
            }
        }
        requestRef.current = requestAnimationFrame(updateLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateLoop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [step]);

    const captureCenter = () => {
        const gp = navigator.getGamepads()[0] || navigator.getGamepads()[1];
        if (!gp) return;

        setTempCal({
            yaw: { ...tempCal.yaw, center: gp.axes[AXIS_MAP.YAW], min: gp.axes[AXIS_MAP.YAW], max: gp.axes[AXIS_MAP.YAW] },
            throttle: { ...tempCal.throttle, center: gp.axes[AXIS_MAP.THROTTLE], min: gp.axes[AXIS_MAP.THROTTLE], max: gp.axes[AXIS_MAP.THROTTLE] },
            roll: { ...tempCal.roll, center: gp.axes[AXIS_MAP.ROLL], min: gp.axes[AXIS_MAP.ROLL], max: gp.axes[AXIS_MAP.ROLL] },
            pitch: { ...tempCal.pitch, center: gp.axes[AXIS_MAP.PITCH], min: gp.axes[AXIS_MAP.PITCH], max: gp.axes[AXIS_MAP.PITCH] },
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
    onClose 
}) => {
  const [showCalibration, setShowCalibration] = useState(false);
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
            onSave={(newCal) => { setCalibration(newCal); setShowCalibration(false); }} 
            onCancel={() => setShowCalibration(false)}
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
                    <div className="flex gap-4">
                        <button 
                        onClick={() => setInputMode('GAMEPAD')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${inputMode === 'GAMEPAD' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                        <Gamepad2 size={20} />
                        <span className="font-bold">Gamepad</span>
                        </button>
                        <button 
                        onClick={() => setInputMode('KEYBOARD')}
                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${inputMode === 'KEYBOARD' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                        <Keyboard size={20} />
                        <span className="font-bold">Keyboard</span>
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
          {inputMode === 'GAMEPAD' && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-white uppercase mb-3 flex items-center gap-2"><Crosshair size={18}/> Controller Mapping</h3>
                  <div className="flex flex-col gap-4">
                      <button 
                        onClick={() => setShowCalibration(true)}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                      >
                          <Crosshair size={18} />
                          Calibrate Sticks
                      </button>

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
