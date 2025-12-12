
import React from 'react';
import { Settings, RefreshCw, Gamepad2, Keyboard, Info } from 'lucide-react';
import { InputMode, CameraMode } from '../types';

interface HUDProps {
  speed: number;
  altitude: number;
  throttle: number;
  fps: number;
  controllerConnected: boolean;
  inputMode: InputMode;
  cameraMode: CameraMode;
  onOpenSettings: () => void;
  onReset: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  speed, 
  altitude, 
  throttle, 
  fps, 
  controllerConnected,
  inputMode,
  cameraMode,
  onOpenSettings,
  onReset
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-2">
           {inputMode === 'GAMEPAD' ? (
               <>
                <div className={`flex items-center gap-2 px-3 py-1 rounded bg-black/50 backdrop-blur ${controllerConnected ? 'text-green-400' : 'text-red-400'}`}>
                    <Gamepad2 size={18} />
                    <span className="text-xs font-mono font-bold">{controllerConnected ? 'CONTROLLER CONNECTED' : 'NO CONTROLLER'}</span>
                </div>
                {!controllerConnected && (
                    <div className="text-xs text-yellow-500 bg-black/50 p-2 rounded max-w-xs">
                        Connect USB controller or switch to Keyboard in Settings.
                    </div>
                )}
               </>
           ) : (
                <div className="flex items-center gap-2 px-3 py-1 rounded bg-black/50 backdrop-blur text-blue-400">
                    <Keyboard size={18} />
                    <span className="text-xs font-mono font-bold">KEYBOARD MODE</span>
                </div>
           )}
        </div>
        
        <div className="flex gap-2">
            <button onClick={onReset} className="p-2 bg-gray-800/80 text-white rounded hover:bg-gray-700 transition-colors" title="Reset Drone (R)">
                <RefreshCw size={20} />
            </button>
            <button onClick={onOpenSettings} className="p-2 bg-gray-800/80 text-white rounded hover:bg-gray-700 transition-colors" title="Settings (M)">
                <Settings size={20} />
            </button>
        </div>
      </div>

      {/* Center Crosshair - Only in FPV */}
      {cameraMode === 'FPV' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
             <div className="w-4 h-0.5 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
             <div className="h-4 w-0.5 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
          </div>
      )}

      {/* Telemetry */}
      <div className="flex justify-between items-end text-white font-mono text-shadow-md">
         <div className="flex flex-col gap-1 text-left">
            <div className="bg-black/40 px-2 py-1 rounded">
               <span className="text-gray-400 text-xs">THR</span>
               <div className="h-2 w-24 bg-gray-700 mt-1 relative overflow-hidden rounded-full">
                  <div className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-75" style={{ width: `${throttle}%` }}></div>
               </div>
            </div>
            <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-gray-400 text-xs block">ALT</span>
                <span className="text-xl font-bold">{altitude.toFixed(1)}m</span>
            </div>
         </div>

         <div className="flex flex-col gap-1 text-right">
             <div className="bg-black/40 px-2 py-1 rounded">
                <span className="text-gray-400 text-xs block">SPD</span>
                <span className="text-xl font-bold">{speed.toFixed(0)} km/h</span>
            </div>
            <div className="text-xs text-gray-500">{fps} FPS</div>
         </div>
      </div>
    </div>
  );
};

export default HUD;
