
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rates, InputMode, Calibration, CameraMode } from '../types';
import { calculateRate, applyDeadband } from '../services/physics';
import { normalizeInput } from '../services/gamepad';
import { GRAVITY, DRAG, THRUST_POWER, AXIS_MAP } from '../constants';

interface DroneProps {
  rates: Rates;
  inputMode: InputMode;
  cameraTilt: number; // in degrees
  cameraMode: CameraMode;
  setTelemetry: (data: { speed: number; altitude: number; throttle: number; distance: number }) => void;
  resetSignal: number;
  calibration: Calibration;
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

const Drone: React.FC<DroneProps> = ({ rates, inputMode, cameraTilt, cameraMode, setTelemetry, resetSignal, calibration }) => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Group>(null);
  
  // Physics state
  const position = useRef(new THREE.Vector3(0, 1, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const quaternion = useRef(new THREE.Quaternion());
  
  // Input State
  const activeKeys = useRef<Set<string>>(new Set());
  const virtualSticks = useRef({ throttle: 0, yaw: 0, pitch: 0, roll: 0 });
  
  // Shared ref for visuals (passed to children to avoid re-renders)
  const throttleRef = useRef(0);

  // Reuse vector objects
  const vectors = useMemo(() => ({
    thrust: new THREE.Vector3(),
    gravity: new THREE.Vector3(0, -GRAVITY, 0),
    drag: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    tiltAxis: new THREE.Vector3(1, 0, 0),
  }), []);

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
    position.current.set(0, 2, 0);
    velocity.current.set(0, 0, 0);
    quaternion.current.set(0, 0, 0, 1);
    virtualSticks.current.throttle = 0; // Reset throttle on respawn
    throttleRef.current = 0;
    if (meshRef.current) {
        meshRef.current.position.copy(position.current);
        meshRef.current.quaternion.copy(quaternion.current);
    }
  }, [resetSignal]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.1);

    let throttle = 0;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;

    if (inputMode === 'GAMEPAD') {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0] || gamepads[1];
        
        if (gp) {
            // Apply calibration normalization
            // Normalized returns -1 to 1 based on calibration
            const rawThrottle = normalizeInput(gp.axes[AXIS_MAP.THROTTLE], calibration.throttle);
            const rawYaw = normalizeInput(gp.axes[AXIS_MAP.YAW], calibration.yaw);
            const rawPitch = normalizeInput(gp.axes[AXIS_MAP.PITCH], calibration.pitch);
            const rawRoll = normalizeInput(gp.axes[AXIS_MAP.ROLL], calibration.roll);

            // Map throttle from [-1, 1] to [0, 1]
            // Standard Gamepad: Up is -1. 
            // Normalize Input handles inversion if the setting is checked.
            // But we assume the result of NormalizeInput follows standard: Up = -1, Down = 1.
            // So for throttle: Up (-1) should be 1.0 (Full), Down (1) should be 0.0 (Idle)
            throttle = Math.max(0, Math.min(1, (rawThrottle * -1 + 1) / 2));
            
            // Yaw: Left is -1. Standard axes usually left is -1.
            yaw = applyDeadband(rawYaw) * -1; // -1 to invert logic if needed, depends on sim
            
            // Pitch: Up is -1. Sim needs Forward (Up) to be negative pitch rate? 
            // In ThreeJS quaternion: +X rotation is down? 
            // Let's stick to existing logic: `* -1`
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

    // Physics Update
    const yawRate = THREE.MathUtils.degToRad(calculateRate(yaw, rates.yaw));
    const pitchRate = THREE.MathUtils.degToRad(calculateRate(pitch, rates.pitch));
    const rollRate = THREE.MathUtils.degToRad(calculateRate(roll, rates.roll));

    // Update Rotation (Local Acro)
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), pitchRate * dt);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yawRate * dt);
    const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,-1), rollRate * dt);
    
    quaternion.current.multiply(qPitch);
    quaternion.current.multiply(qYaw);
    quaternion.current.multiply(qRoll);
    quaternion.current.normalize();

    // Update Velocity
    velocity.current.addScaledVector(vectors.gravity, dt);
    
    vectors.thrust.copy(vectors.up).applyQuaternion(quaternion.current);
    vectors.thrust.multiplyScalar(throttle * THRUST_POWER * dt);
    velocity.current.add(vectors.thrust);

    vectors.drag.copy(velocity.current).multiplyScalar(-DRAG * dt);
    velocity.current.add(vectors.drag);

    // Update Position
    position.current.addScaledVector(velocity.current, dt);

    // Floor Collision
    if (position.current.y < 0.2) {
      position.current.y = 0.2;
      velocity.current.y = 0;
      velocity.current.multiplyScalar(0.8);
    }

    // Apply to ThreeJS Objects
    meshRef.current.position.copy(position.current);
    meshRef.current.quaternion.copy(quaternion.current);

    // Update Camera based on Mode
    if (cameraMode === 'FPV') {
        camera.position.copy(position.current);
        camera.quaternion.copy(quaternion.current);
        // Apply camera tilt (Rotate Up relative to drone)
        camera.rotateX(THREE.MathUtils.degToRad(cameraTilt));
    } else if (cameraMode === 'THIRD_PERSON') {
        // Chase cam: Locked offset relative to drone rotation
        // Offset: Up and Behind
        const offset = new THREE.Vector3(0, 1.0, 2.5);
        offset.applyQuaternion(quaternion.current);
        camera.position.copy(position.current).add(offset);
        camera.lookAt(position.current);
    } else if (cameraMode === 'LOS') {
        // Line of Sight: Static position
        camera.position.set(0, 1.7, 5); // Standing height, slightly behind origin
        camera.lookAt(position.current);
    }
    
    // Telemetry
    if (state.clock.elapsedTime % 0.1 < 0.02) {
        setTelemetry({
            speed: velocity.current.length() * 3.6,
            altitude: position.current.y,
            throttle: throttle * 100,
            distance: position.current.length()
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
