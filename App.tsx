
import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats, Sky, Stars } from '@react-three/drei';
import Drone from './components/Drone';
import { Environment } from './components/World';
import HUD from './components/HUD';
import SettingsPanel from './components/SettingsPanel';
import StaticOverlay from './components/StaticOverlay';
import { DEFAULT_RATES, DEFAULT_CALIBRATION, DEFAULT_CHANNEL_MAP, DEFAULT_WIND_SETTINGS } from './constants';
import { Rates, InputMode, Calibration, CameraMode, ChannelMap, WindSettings } from './types';
import { hidController } from './services/webhid';

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
  const [cameraMode, setCameraMode] = useState<CameraMode>(initialSettings?.cameraMode || 'FPV');
  const [analogStatic, setAnalogStatic] = useState(initialSettings?.analogStatic ?? false);
  const [calibration, setCalibration] = useState<Calibration>(initialSettings?.calibration || DEFAULT_CALIBRATION);
  const [channelMap, setChannelMap] = useState<ChannelMap>(initialSettings?.channelMap || DEFAULT_CHANNEL_MAP);
  const [windSettings, setWindSettings] = useState<WindSettings>(initialSettings?.windSettings || DEFAULT_WIND_SETTINGS);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [hidConnected, setHidConnected] = useState(false);
  const [hidChannels, setHidChannels] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [gamepadAxes, setGamepadAxes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

  // Telemetry state
  const [telemetry, setTelemetry] = useState({ speed: 0, altitude: 0, throttle: 0, distance: 0 });

  // Persist settings whenever they change
  useEffect(() => {
    const settingsToSave = {
      rates,
      inputMode,
      cameraTilt,
      cameraMode,
      analogStatic,
      calibration,
      channelMap,
      windSettings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [rates, inputMode, cameraTilt, cameraMode, analogStatic, calibration, channelMap, windSettings]);

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
      // Cycle camera modes with 'C'
      if (e.key.toLowerCase() === 'c') {
          setCameraMode(prev => {
              if (prev === 'FPV') return 'THIRD_PERSON';
              if (prev === 'THIRD_PERSON') return 'LOS';
              return 'FPV';
          });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, toggleSettings]);

  // Controller Detection (Gamepad API) and Axis Polling
  useEffect(() => {
    const handleConnect = () => setControllerConnected(true);
    const handleDisconnect = () => setControllerConnected(false);

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    if (navigator.getGamepads()[0]) setControllerConnected(true);

    // Poll gamepad axes when settings panel is open
    let animationId: number;
    const pollGamepad = () => {
      if (isSettingsOpen && inputMode === 'GAMEPAD') {
        const gp = navigator.getGamepads()[0] || navigator.getGamepads()[1];
        if (gp) {
          const axes = Array.from(gp.axes).slice(0, 8);
          // Pad to 8 axes if needed
          while (axes.length < 8) axes.push(0);
          setGamepadAxes(axes);
        }
      }
      animationId = requestAnimationFrame(pollGamepad);
    };
    animationId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
      cancelAnimationFrame(animationId);
    };
  }, [isSettingsOpen, inputMode]);

  // WebHID Connection and Value Updates
  useEffect(() => {
    // Try to reconnect to previously paired HID device
    if (inputMode === 'WEBHID') {
      hidController.tryReconnect().then(connected => {
        setHidConnected(connected);
      });
    }

    // Subscribe to HID channel updates
    const unsubscribe = hidController.subscribe((channels) => {
      setHidChannels(channels);
      setHidConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, [inputMode]);

  const handleConnectHID = useCallback(async () => {
    const connected = await hidController.requestDevice();
    setHidConnected(connected);
    if (connected) {
      setInputMode('WEBHID');
    }
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
            cameraMode={cameraMode}
            setTelemetry={setTelemetry}
            resetSignal={resetSignal}
            calibration={calibration}
            channelMap={channelMap}
            hidChannels={hidChannels}
            windSettings={windSettings}
        />
        
        <Stats className="!left-auto !right-0 !top-12" />
      </Canvas>

      {/* Analog Static Overlay - only in FPV mode */}
      {analogStatic && cameraMode === 'FPV' && <StaticOverlay distance={telemetry.distance} />}

      <HUD
        speed={telemetry.speed}
        altitude={telemetry.altitude}
        throttle={telemetry.throttle}
        fps={0}
        controllerConnected={inputMode === 'WEBHID' ? hidConnected : controllerConnected}
        inputMode={inputMode}
        cameraMode={cameraMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReset={handleReset}
        onConnectHID={handleConnectHID}
      />

      {isSettingsOpen && (
        <SettingsPanel
            rates={rates}
            setRates={setRates}
            inputMode={inputMode}
            setInputMode={setInputMode}
            cameraTilt={cameraTilt}
            setCameraTilt={setCameraTilt}
            cameraMode={cameraMode}
            setCameraMode={setCameraMode}
            analogStatic={analogStatic}
            setAnalogStatic={setAnalogStatic}
            calibration={calibration}
            setCalibration={setCalibration}
            channelMap={channelMap}
            setChannelMap={setChannelMap}
            hidChannels={hidChannels}
            gamepadAxes={gamepadAxes}
            windSettings={windSettings}
            setWindSettings={setWindSettings}
            onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
