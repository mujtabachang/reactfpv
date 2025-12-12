
import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats, Sky, Stars } from '@react-three/drei';
import Drone from './components/Drone';
import { Environment } from './components/World';
import HUD from './components/HUD';
import SettingsPanel from './components/SettingsPanel';
import StaticOverlay from './components/StaticOverlay';
import { DEFAULT_RATES, DEFAULT_CALIBRATION } from './constants';
import { Rates, InputMode, Calibration } from './types';

const STORAGE_KEY = 'react_fpv_settings_v1';

const App = () => {
  // Initialize state from localStorage if available
  const [initialSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Failed to load settings:', e);
      return null;
    }
  });

  const [rates, setRates] = useState<Rates>(initialSettings?.rates || DEFAULT_RATES);
  const [inputMode, setInputMode] = useState<InputMode>(initialSettings?.inputMode || 'GAMEPAD');
  const [cameraTilt, setCameraTilt] = useState(initialSettings?.cameraTilt ?? 25);
  const [analogStatic, setAnalogStatic] = useState(initialSettings?.analogStatic ?? false);
  const [calibration, setCalibration] = useState<Calibration>(initialSettings?.calibration || DEFAULT_CALIBRATION);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [controllerConnected, setControllerConnected] = useState(false);
  
  // Telemetry state
  const [telemetry, setTelemetry] = useState({ speed: 0, altitude: 0, throttle: 0, distance: 0 });

  // Persist settings whenever they change
  useEffect(() => {
    const settingsToSave = {
      rates,
      inputMode,
      cameraTilt,
      analogStatic,
      calibration
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [rates, inputMode, cameraTilt, analogStatic, calibration]);

  const handleReset = useCallback(() => {
    setResetSignal(s => s + 1);
  }, []);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);

  // Keyboard Shortcuts (Global)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default on game keys to avoid scrolling etc if we were in a scrolling page
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
         // e.preventDefault(); 
      }

      if (e.key.toLowerCase() === 'r') handleReset();
      if (e.key.toLowerCase() === 'm' || e.key === 'Escape') toggleSettings();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, toggleSettings]);

  // Controller Detection
  useEffect(() => {
    const handleConnect = () => setControllerConnected(true);
    const handleDisconnect = () => setControllerConnected(false);
    
    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);
    
    if (navigator.getGamepads()[0]) setControllerConnected(true);
    
    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative select-none overflow-hidden font-sans">
      <Canvas shadows camera={{ fov: 90, near: 0.1, far: 1000 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <fog attach="fog" args={['#1a1a1a', 10, 200]} />
        
        <Environment />
        
        <Drone 
            rates={rates} 
            inputMode={inputMode}
            cameraTilt={cameraTilt}
            setTelemetry={setTelemetry} 
            resetSignal={resetSignal}
            calibration={calibration}
        />
        
        <Stats className="!left-auto !right-0 !top-12" />
      </Canvas>

      {/* Analog Static Overlay */}
      {analogStatic && <StaticOverlay distance={telemetry.distance} />}

      <HUD 
        speed={telemetry.speed}
        altitude={telemetry.altitude}
        throttle={telemetry.throttle}
        fps={0} 
        controllerConnected={controllerConnected}
        inputMode={inputMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
      />

      {isSettingsOpen && (
        <SettingsPanel 
            rates={rates} 
            setRates={setRates} 
            inputMode={inputMode}
            setInputMode={setInputMode}
            cameraTilt={cameraTilt}
            setCameraTilt={setCameraTilt}
            analogStatic={analogStatic}
            setAnalogStatic={setAnalogStatic}
            calibration={calibration}
            setCalibration={setCalibration}
            onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
