
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rates, InputMode, Calibration, CameraMode, ChannelMap, WindSettings, DronePhysicsSettings } from '../types';
import { calculateRate, applyDeadband } from '../services/physics';
import { normalizeInput } from '../services/gamepad';
import { DronePhysicsEngine, PhysicsState, createSpecsFromSettings } from '../services/dronePhysics';

interface DroneProps {
  rates: Rates;
  inputMode: InputMode;
  cameraTilt: number; // in degrees
  cameraMode: CameraMode;
  setTelemetry: (data: { speed: number; altitude: number; throttle: number; distance: number }) => void;
  resetSignal: number;
  calibration: Calibration;
  channelMap: ChannelMap;
  hidChannels: number[];
  windSettings: WindSettings;
  dronePhysics: DronePhysicsSettings;
}

// Visual Components
const Propeller = ({ position, rotation, speedRef }: { position: [number, number, number], rotation: [number, number, number], speedRef: React.MutableRefObject<number> }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (groupRef.current) {
            // Spin based on speedRef (throttle)
            // Base idle spin + throttle spin
            const spinSpeed = 10 + (speedRef.current * 80);
            groupRef.current.rotation.y += spinSpeed * delta;
        }
    });

    return (
        <group position={position} rotation={rotation as any} ref={groupRef}>
            {/* Hub */}
            <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.01, 0.01, 0.01, 8]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {/* Blade 1 */}
            <mesh position={[0.04, 0, 0]} rotation={[0.1, 0, 0]} castShadow>
                <boxGeometry args={[0.08, 0.002, 0.01]} />
                <meshStandardMaterial color="#ff6600" transparent opacity={0.8} />
            </mesh>
             {/* Blade 2 */}
             <mesh position={[-0.02, 0, 0.035]} rotation={[0.1, 2.09, 0]} castShadow>
                <boxGeometry args={[0.08, 0.002, 0.01]} />
                <meshStandardMaterial color="#ff6600" transparent opacity={0.8} />
            </mesh>
             {/* Blade 3 */}
             <mesh position={[-0.02, 0, -0.035]} rotation={[0.1, -2.09, 0]} castShadow>
                <boxGeometry args={[0.08, 0.002, 0.01]} />
                <meshStandardMaterial color="#ff6600" transparent opacity={0.8} />
            </mesh>
        </group>
    )
}

const DroneModel = ({ throttleRef }: { throttleRef: React.MutableRefObject<number> }) => {
    return (
        <group>
             {/* Main Frame Body */}
             <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.05, 0.04, 0.15]} />
                <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8} />
             </mesh>
             {/* Top Plate */}
             <mesh position={[0, 0.025, 0]} castShadow>
                <boxGeometry args={[0.05, 0.002, 0.15]} />
                <meshStandardMaterial color="#222" />
             </mesh>
             {/* Arms (X shape) */}
             <mesh position={[0, -0.01, 0]} rotation={[0, 0.785, 0]} castShadow>
                 <boxGeometry args={[0.25, 0.005, 0.03]} />
                 <meshStandardMaterial color="#1a1a1a" />
             </mesh>
             <mesh position={[0, -0.01, 0]} rotation={[0, -0.785, 0]} castShadow>
                 <boxGeometry args={[0.25, 0.005, 0.03]} />
                 <meshStandardMaterial color="#1a1a1a" />
             </mesh>

             {/* Motors */}
             <mesh position={[0.09, 0, 0.09]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.02]} />
                <meshStandardMaterial color="#444" metalness={1} />
             </mesh>
             <mesh position={[-0.09, 0, 0.09]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.02]} />
                <meshStandardMaterial color="#444" metalness={1} />
             </mesh>
             <mesh position={[0.09, 0, -0.09]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.02]} />
                <meshStandardMaterial color="#444" metalness={1} />
             </mesh>
             <mesh position={[-0.09, 0, -0.09]} castShadow>
                <cylinderGeometry args={[0.015, 0.015, 0.02]} />
                <meshStandardMaterial color="#444" metalness={1} />
             </mesh>

             {/* Propellers */}
             <Propeller position={[0.09, 0.015, 0.09]} rotation={[0,0,0]} speedRef={throttleRef} />
             <Propeller position={[-0.09, 0.015, 0.09]} rotation={[0,0,0]} speedRef={throttleRef} />
             <Propeller position={[0.09, 0.015, -0.09]} rotation={[0,0,0]} speedRef={throttleRef} />
             <Propeller position={[-0.09, 0.015, -0.09]} rotation={[0,0,0]} speedRef={throttleRef} />

             {/* FPV Camera */}
             <group position={[0, 0.03, -0.06]}>
                 <mesh castShadow>
                     <boxGeometry args={[0.02, 0.02, 0.02]} />
                     <meshStandardMaterial color="#222" />
                 </mesh>
                 <mesh position={[0, 0, -0.011]} rotation={[1.57, 0, 0]}>
                     <cylinderGeometry args={[0.008, 0.008, 0.005]} />
                     <meshStandardMaterial color="#000044" metalness={0.9} roughness={0.1} />
                 </mesh>
             </group>

             {/* Battery / Strap (Visual detail) */}
             <mesh position={[0, 0.045, -0.02]} castShadow>
                 <boxGeometry args={[0.035, 0.025, 0.08]} />
                 <meshStandardMaterial color="#333" />
             </mesh>
             <mesh position={[0, 0.045, -0.02]} castShadow>
                 <boxGeometry args={[0.036, 0.025, 0.01]} />
                 <meshStandardMaterial color="#ccff00" />
             </mesh>
        </group>
    )
}

const Drone: React.FC<DroneProps> = ({ rates, inputMode, cameraTilt, cameraMode, setTelemetry, resetSignal, calibration, channelMap, hidChannels, windSettings, dronePhysics }) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Group>(null);

  // Physics engine instance
  const physicsEngine = useMemo(() => new DronePhysicsEngine(), []);

  // Update physics engine when drone physics settings change
  useEffect(() => {
    const specs = createSpecsFromSettings(dronePhysics);
    physicsEngine.updateSpecs(specs);
  }, [dronePhysics, physicsEngine]);

  // Physics state
  const physicsState = useRef<PhysicsState>(DronePhysicsEngine.createInitialState());

  // Input State
  const activeKeys = useRef<Set<string>>(new Set());
  const virtualSticks = useRef({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });

  // Shared ref for visuals (passed to children to avoid re-renders)
  const throttleRef = useRef(0);

  // Update wind settings when they change
  useEffect(() => {
    const angleRad = THREE.MathUtils.degToRad(windSettings.directionAngle);
    const direction = new THREE.Vector3(
      Math.sin(angleRad),  // X component
      0,                    // No vertical wind direction
      Math.cos(angleRad)   // Z component
    );

    physicsEngine.updateWindConfig({
      enabled: windSettings.enabled,
      baseSpeed: windSettings.baseSpeed,
      direction: direction,
      gustStrength: windSettings.gustStrength,
      gustFrequency: windSettings.gustFrequency,
      turbulenceScale: windSettings.turbulenceScale,
    });
  }, [windSettings, physicsEngine]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => activeKeys.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => activeKeys.current.delete(e.code);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    }
  }, []);

  // Reset logic
  useEffect(() => {
    physicsState.current = DronePhysicsEngine.createInitialState();
    virtualSticks.current.throttle = 0; // Reset throttle on respawn
    throttleRef.current = 0;
    if (meshRef.current) {
        meshRef.current.position.copy(physicsState.current.position);
        meshRef.current.quaternion.copy(physicsState.current.quaternion);
    }
  }, [resetSignal]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05); // Clamp to prevent instability

    let throttle = 0;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;

    if (inputMode === 'WEBHID') {
        // WebHID input from RadioMaster - use channel map to get correct channels
        // All channels are normalized to -1 to 1
        const rawThrottle = normalizeInput(hidChannels[channelMap.throttle] ?? 0, calibration.throttle);
        const rawYaw = normalizeInput(hidChannels[channelMap.yaw] ?? 0, calibration.yaw);
        const rawPitch = normalizeInput(hidChannels[channelMap.pitch] ?? 0, calibration.pitch);
        const rawRoll = normalizeInput(hidChannels[channelMap.roll] ?? 0, calibration.roll);

        // Convert throttle from -1 to 1 range to 0 to 1
        throttle = Math.max(0, Math.min(1, (rawThrottle + 1) / 2));
        yaw = applyDeadband(rawYaw);
        pitch = applyDeadband(rawPitch);
        roll = applyDeadband(rawRoll);
    } else if (inputMode === 'GAMEPAD') {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0] || gamepads[1];

        if (gp) {
            // Use channel map to get correct axis indices
            const rawThrottle = normalizeInput(gp.axes[channelMap.throttle] ?? 0, calibration.throttle);
            const rawYaw = normalizeInput(gp.axes[channelMap.yaw] ?? 0, calibration.yaw);
            const rawPitch = normalizeInput(gp.axes[channelMap.pitch] ?? 0, calibration.pitch);
            const rawRoll = normalizeInput(gp.axes[channelMap.roll] ?? 0, calibration.roll);

            // Map throttle from [-1, 1] to [0, 1]
            // Standard Gamepad: Up is -1.
            throttle = Math.max(0, Math.min(1, (rawThrottle * -1 + 1) / 2));

            // Yaw: Left is -1. Standard axes usually left is -1.
            yaw = applyDeadband(rawYaw) * -1;

            // Pitch: Up is -1.
            pitch = applyDeadband(rawPitch) * -1;

            // Roll: Right is 1.
            roll = applyDeadband(rawRoll);
        }
    } else {
        // Keyboard Input (Virtual Sticks)
        const keys = activeKeys.current;
        const rampSpeed = 2.0 * dt; // Throttle change speed
        const stickSpeed = 10.0 * dt; // Stick centering/movement speed

        // Throttle (Stateful)
        if (keys.has('KeyW')) virtualSticks.current.throttle += rampSpeed;
        if (keys.has('KeyS')) virtualSticks.current.throttle -= rampSpeed;
        virtualSticks.current.throttle = Math.max(0, Math.min(1, virtualSticks.current.throttle));
        throttle = virtualSticks.current.throttle;

        // Yaw (Left Hand: A/D)
        let targetYaw = 0;
        if (keys.has('KeyA')) targetYaw = 1;
        if (keys.has('KeyD')) targetYaw = -1;
        virtualSticks.current.yaw += (targetYaw - virtualSticks.current.yaw) * stickSpeed;
        yaw = virtualSticks.current.yaw;

        // Pitch (Right Hand: Arrows Up/Down)
        let targetPitch = 0;
        if (keys.has('ArrowUp')) targetPitch = -1;
        if (keys.has('ArrowDown')) targetPitch = 1;
        virtualSticks.current.pitch += (targetPitch - virtualSticks.current.pitch) * stickSpeed;
        pitch = virtualSticks.current.pitch;

        // Roll (Right Hand: Arrows Left/Right)
        let targetRoll = 0;
        if (keys.has('ArrowLeft')) targetRoll = -1;
        if (keys.has('ArrowRight')) targetRoll = 1;
        virtualSticks.current.roll += (targetRoll - virtualSticks.current.roll) * stickSpeed;
        roll = virtualSticks.current.roll;
    }

    // Update shared ref for visuals
    throttleRef.current = throttle;

    // Calculate angular rates from stick input using Betaflight-style rates (deg/s -> rad/s)
    const yawRate = THREE.MathUtils.degToRad(calculateRate(yaw, rates.yaw));
    const pitchRate = THREE.MathUtils.degToRad(calculateRate(pitch, rates.pitch));
    const rollRate = THREE.MathUtils.degToRad(calculateRate(roll, rates.roll));

    // Run physics simulation step
    physicsState.current = physicsEngine.step(
      physicsState.current,
      throttle,
      rollRate,
      pitchRate,
      yawRate,
      dt,
      state.clock.elapsedTime
    );

    // Apply to ThreeJS Objects
    meshRef.current.position.copy(physicsState.current.position);
    meshRef.current.quaternion.copy(physicsState.current.quaternion);

    // Update Camera based on Mode
    if (cameraMode === 'FPV') {
        camera.position.copy(physicsState.current.position);
        camera.quaternion.copy(physicsState.current.quaternion);
        // Apply camera tilt (Rotate Up relative to drone)
        camera.rotateX(THREE.MathUtils.degToRad(cameraTilt));
    } else if (cameraMode === 'THIRD_PERSON') {
        // Chase cam: Locked offset relative to drone rotation
        // Offset: Up and Behind
        const offset = new THREE.Vector3(0, 1.0, 2.5);
        offset.applyQuaternion(physicsState.current.quaternion);
        camera.position.copy(physicsState.current.position).add(offset);
        camera.lookAt(physicsState.current.position);
    } else if (cameraMode === 'LOS') {
        // Line of Sight: Static position
        camera.position.set(0, 1.7, 5); // Standing height, slightly behind origin
        camera.lookAt(physicsState.current.position);
    }

    // Telemetry - update at ~10Hz
    if (state.clock.elapsedTime % 0.1 < 0.02) {
        setTelemetry({
            speed: physicsState.current.velocity.length() * 3.6, // m/s to km/h
            altitude: physicsState.current.position.y,           // meters
            throttle: throttle * 100,                            // percentage
            distance: physicsState.current.position.length()     // meters from origin
        });
    }
  });

  return (
    <group ref={meshRef}>
       <DroneModel throttleRef={throttleRef} />
    </group>
  );
};

export default Drone;
