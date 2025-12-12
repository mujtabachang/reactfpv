
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
  cameraFov: number; // field of view in degrees
  cameraAspectRatio: string; // aspect ratio setting
  cameraMode: CameraMode;
  setTelemetry: (data: { speed: number; altitude: number; throttle: number; distance: number }) => void;
  resetSignal: number;
  calibration: Calibration;
  channelMap: ChannelMap;
  hidChannels: number[];
  windSettings: WindSettings;
  dronePhysics: DronePhysicsSettings;
}

// Create a proper propeller blade geometry with airfoil shape and twist
const createBladeGeometry = () => {
    const shape = new THREE.Shape();

    // Blade outline - tapered with rounded tip
    const bladeLength = 0.065;
    const rootWidth = 0.012;
    const tipWidth = 0.006;
    const rootOffset = 0.008; // Start slightly away from center for hub

    // Start at root trailing edge
    shape.moveTo(rootOffset, -rootWidth / 2);

    // Root to tip (trailing edge) - slight curve
    shape.quadraticCurveTo(
        bladeLength * 0.6, -tipWidth * 0.8,
        bladeLength, -tipWidth / 3
    );

    // Rounded tip
    shape.quadraticCurveTo(
        bladeLength + tipWidth * 0.3, 0,
        bladeLength, tipWidth / 3
    );

    // Tip to root (leading edge) - slight curve
    shape.quadraticCurveTo(
        bladeLength * 0.6, tipWidth * 0.8,
        rootOffset, rootWidth / 2
    );

    // Close at root
    shape.quadraticCurveTo(
        rootOffset - 0.002, 0,
        rootOffset, -rootWidth / 2
    );

    // Extrude with twist to simulate blade pitch variation
    const extrudeSettings = {
        steps: 12,
        depth: 0.003,
        bevelEnabled: true,
        bevelThickness: 0.0005,
        bevelSize: 0.0005,
        bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Apply twist - more pitch at root, less at tip (like real props)
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        // Twist angle based on distance from root (decreasing pitch toward tip)
        const distanceRatio = (x - rootOffset) / (bladeLength - rootOffset);
        const twistAngle = (1 - distanceRatio) * 0.35; // ~20 degrees at root, ~0 at tip

        // Rotate around X axis (blade span axis)
        const newY = y * Math.cos(twistAngle) - z * Math.sin(twistAngle);
        const newZ = y * Math.sin(twistAngle) + z * Math.cos(twistAngle);

        positions.setY(i, newY);
        positions.setZ(i, newZ);
    }

    geometry.computeVertexNormals();
    geometry.center();

    // Rotate so blade extends along X axis and sits flat initially
    geometry.rotateZ(Math.PI / 2);
    geometry.rotateX(Math.PI / 2);

    return geometry;
};

// Visual Components
const Propeller = ({ position, rotation, speedRef, clockwise = true }: {
    position: [number, number, number],
    rotation: [number, number, number],
    speedRef: React.MutableRefObject<number>,
    clockwise?: boolean
}) => {
    const groupRef = useRef<THREE.Group>(null);

    // Create blade geometry once
    const bladeGeometry = useMemo(() => createBladeGeometry(), []);

    // Mirror geometry for counter-clockwise props
    const mirroredBladeGeometry = useMemo(() => {
        const geo = createBladeGeometry();
        geo.scale(1, 1, -1); // Mirror on Z axis
        return geo;
    }, []);

    const activeGeometry = clockwise ? bladeGeometry : mirroredBladeGeometry;

    useFrame((_, delta) => {
        if (groupRef.current) {
            // Spin based on speedRef (throttle)
            // Base idle spin + throttle spin
            const spinSpeed = 10 + (speedRef.current * 80);
            const direction = clockwise ? 1 : -1;
            groupRef.current.rotation.y += spinSpeed * delta * direction;
        }
    });

    // 120 degrees apart for tri-blade
    const bladeAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    return (
        <group position={position} rotation={rotation as any} ref={groupRef}>
            {/* Hub - slightly larger and more detailed */}
            <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.01, 0.012, 12]} />
                <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Hub cap */}
            <mesh position={[0, 0.007, 0]} castShadow>
                <cylinderGeometry args={[0.006, 0.008, 0.004, 12]} />
                <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Three blades at 120 degree intervals */}
            {bladeAngles.map((angle, index) => (
                <mesh
                    key={index}
                    position={[
                        Math.cos(angle) * 0.035,
                        0.002,
                        Math.sin(angle) * 0.035
                    ]}
                    rotation={[0, -angle + Math.PI / 2, 0]}
                    geometry={activeGeometry}
                    castShadow
                >
                    <meshStandardMaterial
                        color="#ff6600"
                        transparent
                        opacity={0.85}
                        side={THREE.DoubleSide}
                        roughness={0.4}
                        metalness={0.1}
                    />
                </mesh>
            ))}
        </group>
    );
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

             {/* Propellers - diagonal pairs spin same direction for yaw control */}
             <Propeller position={[0.09, 0.015, 0.09]} rotation={[0,0,0]} speedRef={throttleRef} clockwise={true} />
             <Propeller position={[-0.09, 0.015, 0.09]} rotation={[0,0,0]} speedRef={throttleRef} clockwise={false} />
             <Propeller position={[0.09, 0.015, -0.09]} rotation={[0,0,0]} speedRef={throttleRef} clockwise={false} />
             <Propeller position={[-0.09, 0.015, -0.09]} rotation={[0,0,0]} speedRef={throttleRef} clockwise={true} />

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

const Drone: React.FC<DroneProps> = ({ rates, inputMode, cameraTilt, cameraFov, cameraAspectRatio, cameraMode, setTelemetry, resetSignal, calibration, channelMap, hidChannels, windSettings, dronePhysics }) => {
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
        // FPV camera offset matches the physical camera position on the drone model
        // Camera is mounted at front of drone, slightly above center
        const fpvCameraOffset = new THREE.Vector3(0, 0.03, -0.06);

        // Transform offset by drone's rotation to get world-space camera position
        fpvCameraOffset.applyQuaternion(physicsState.current.quaternion);
        camera.position.copy(physicsState.current.position).add(fpvCameraOffset);

        // Start with drone's orientation
        camera.quaternion.copy(physicsState.current.quaternion);

        // Apply camera tilt (pitch up) around the camera's local X-axis
        // This simulates the adjustable camera angle on real FPV quads
        const tiltQuat = new THREE.Quaternion();
        tiltQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(cameraTilt));
        camera.quaternion.multiply(tiltQuat);

        // Update FOV and aspect ratio for FPV camera
        const perspCam = camera as THREE.PerspectiveCamera;
        let needsUpdate = false;

        // Update FOV (typical range: 90-170 degrees)
        if (perspCam.fov !== cameraFov) {
            perspCam.fov = cameraFov;
            needsUpdate = true;
        }

        // Update aspect ratio based on setting
        const aspectMap: Record<string, number> = {
            '4:3': 4 / 3,
            '16:9': 16 / 9,
        };
        const targetAspect = aspectMap[cameraAspectRatio];
        if (targetAspect && perspCam.aspect !== targetAspect) {
            perspCam.aspect = targetAspect;
            needsUpdate = true;
        } else if (!targetAspect && cameraAspectRatio === 'native') {
            // Reset to window aspect ratio
            const windowAspect = window.innerWidth / window.innerHeight;
            if (Math.abs(perspCam.aspect - windowAspect) > 0.01) {
                perspCam.aspect = windowAspect;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            perspCam.updateProjectionMatrix();
        }
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
