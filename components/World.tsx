import React, { useMemo } from 'react';
import * as THREE from 'three';

// Textured ground with grass-like appearance
export const Ground = () => {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#2d4a2d" roughness={0.9} />
      </mesh>
      {/* Landing pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      {/* Landing pad H */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.5, 2, 32]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

export const GridFloor = () => {
  return <gridHelper args={[500, 50, 0x335533, 0x223322]} position={[0, 0.02, 0]} />;
};

// FPV Racing Gate with LED strips
const Gate = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = '#ff6600'
}: {
  position: [number, number, number],
  rotation?: [number, number, number],
  scale?: number,
  color?: string
}) => {
  return (
    <group position={position} rotation={rotation as any} scale={scale}>
      {/* Square gate frame */}
      <group>
        {/* Top bar */}
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[4.2, 0.15, 0.15]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Bottom bar */}
        <mesh position={[0, -2, 0]} castShadow>
          <boxGeometry args={[4.2, 0.15, 0.15]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Left bar */}
        <mesh position={[-2, 0, 0]} castShadow>
          <boxGeometry args={[0.15, 4.15, 0.15]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Right bar */}
        <mesh position={[2, 0, 0]} castShadow>
          <boxGeometry args={[0.15, 4.15, 0.15]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* LED strips */}
      <group>
        {/* Top LED */}
        <mesh position={[0, 2, 0.1]}>
          <boxGeometry args={[3.8, 0.08, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
        {/* Bottom LED */}
        <mesh position={[0, -2, 0.1]}>
          <boxGeometry args={[3.8, 0.08, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
        {/* Left LED */}
        <mesh position={[-2, 0, 0.1]}>
          <boxGeometry args={[0.08, 3.8, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
        {/* Right LED */}
        <mesh position={[2, 0, 0.1]}>
          <boxGeometry args={[0.08, 3.8, 0.02]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Corner lights */}
      <pointLight position={[2, 2, 0]} distance={8} intensity={1} color={color} />
      <pointLight position={[-2, -2, 0]} distance={8} intensity={1} color={color} />
    </group>
  );
};

// Flag/Banner pole for visual reference
const FlagPole = ({ position, height = 10, color = '#ff0000' }: { position: [number, number, number], height?: number, color?: string }) => {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, height, 8]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Flag */}
      <mesh position={[0.6, height - 0.8, 0]} castShadow>
        <planeGeometry args={[1.2, 0.8]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      {/* Top ball */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={1} />
      </mesh>
    </group>
  );
};

// Concrete pillar/column
const Pillar = ({ position, height = 8, radius = 0.5 }: { position: [number, number, number], height?: number, radius?: number }) => {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius * 1.2, height, 12]} />
      <meshStandardMaterial color="#555" roughness={0.8} />
    </mesh>
  );
};

// Trees for visual reference
const Tree = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 3, 8]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 4, 0]} castShadow>
        <coneGeometry args={[2, 3, 8]} />
        <meshStandardMaterial color="#1a4d1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <coneGeometry args={[1.5, 2.5, 8]} />
        <meshStandardMaterial color="#226622" roughness={0.8} />
      </mesh>
      <mesh position={[0, 6.8, 0]} castShadow>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color="#2a7a2a" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Building/structure
const Building = ({ position, size, color = '#444' }: { position: [number, number, number], size: [number, number, number], color?: string }) => {
  return (
    <mesh position={[position[0], position[1] + size[1] / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
};

// Power tower for gaps/racing
const PowerTower = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Main structure */}
      <mesh position={[0, 15, 0]} castShadow>
        <boxGeometry args={[1, 30, 1]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Cross arm */}
      <mesh position={[0, 28, 0]} castShadow>
        <boxGeometry args={[8, 0.5, 0.5]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Support struts */}
      <mesh position={[-2, 26, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      <mesh position={[2, 26, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.2, 4, 0.2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      {/* Insulators */}
      {[-3, -1, 1, 3].map((x, i) => (
        <mesh key={i} position={[x, 28.5, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.5, 8]} />
          <meshStandardMaterial color="#1a5c1a" />
        </mesh>
      ))}
    </group>
  );
};

// Ramp for freestyle
const Ramp = ({ position, rotation = [0, 0, 0], size = [6, 0.2, 8] }: { position: [number, number, number], rotation?: [number, number, number], size?: [number, number, number] }) => {
  return (
    <mesh position={position} rotation={rotation as any} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#666" roughness={0.6} />
    </mesh>
  );
};

// Shipping container
const Container = ({ position, rotation = [0, 0, 0], color = '#c41e3a' }: { position: [number, number, number], rotation?: [number, number, number], color?: string }) => {
  return (
    <group position={position} rotation={rotation as any}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6, 2.5, 2.5]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Door lines */}
      <mesh position={[3.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

// Bleachers/stands
const Bleachers = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation as any}>
      {[0, 1, 2, 3].map((row) => (
        <mesh key={row} position={[0, row * 0.8 + 0.4, row * 1]} castShadow receiveShadow>
          <boxGeometry args={[15, 0.3, 1.5]} />
          <meshStandardMaterial color="#666" roughness={0.8} />
        </mesh>
      ))}
      {/* Back support */}
      <mesh position={[0, 2, 2.5]} castShadow>
        <boxGeometry args={[15, 4, 0.3]} />
        <meshStandardMaterial color="#555" roughness={0.8} />
      </mesh>
    </group>
  );
};

export const Environment = () => {
  // Generate random tree positions
  const treePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 150;
      positions.push([
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ]);
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-far={300}
      />
      <hemisphereLight args={['#87ceeb', '#2d4a2d', 0.3]} />

      <Ground />
      <GridFloor />

      {/* === RACING TRACK === */}

      {/* Start/Finish line gates */}
      <Gate position={[0, 3, -15]} color="#00ff00" />

      {/* Track gates - creates a circuit */}
      <Gate position={[15, 4, -40]} rotation={[0, -0.3, 0]} color="#ff6600" />
      <Gate position={[30, 6, -60]} rotation={[0, -0.6, 0]} color="#ff6600" />
      <Gate position={[35, 4, -85]} rotation={[0, -1.2, 0]} color="#ff6600" />
      <Gate position={[20, 8, -100]} rotation={[0, -Math.PI, 0]} color="#00ffff" />
      <Gate position={[-10, 5, -95]} rotation={[0, Math.PI + 0.5, 0]} color="#ff6600" />
      <Gate position={[-35, 3, -75]} rotation={[0, Math.PI + 1, 0]} color="#ff6600" />
      <Gate position={[-45, 6, -50]} rotation={[0, Math.PI + 0.5, 0]} color="#ff6600" />
      <Gate position={[-35, 4, -25]} rotation={[0, 0.3, 0]} color="#ff6600" />

      {/* Dive gate */}
      <Gate position={[0, 15, -55]} rotation={[Math.PI / 3, 0, 0]} scale={1.5} color="#ff00ff" />

      {/* Split-S gate (horizontal) */}
      <Gate position={[45, 3, -70]} rotation={[Math.PI / 2, 0, Math.PI / 4]} scale={0.8} color="#ffff00" />

      {/* === OBSTACLES === */}

      {/* Pillars for gaps */}
      <Pillar position={[8, 0, -30]} height={12} radius={0.6} />
      <Pillar position={[-8, 0, -30]} height={12} radius={0.6} />

      {/* Container stack */}
      <Container position={[50, 1.25, -40]} color="#c41e3a" />
      <Container position={[50, 3.75, -40]} rotation={[0, 0.1, 0]} color="#1e90ff" />
      <Container position={[50, 1.25, -45]} color="#ffd700" />

      {/* More containers forming a gap */}
      <Container position={[-50, 1.25, -60]} rotation={[0, Math.PI / 2, 0]} color="#228b22" />
      <Container position={[-50, 3.75, -60]} rotation={[0, Math.PI / 2, 0]} color="#8b0000" />
      <Container position={[-50, 6.25, -60]} rotation={[0, Math.PI / 2, 0]} color="#4169e1" />

      {/* Ramps for freestyle */}
      <Ramp position={[-20, 1.5, -20]} rotation={[-Math.PI / 8, 0, 0]} />
      <Ramp position={[25, 1.5, -20]} rotation={[-Math.PI / 8, Math.PI / 4, 0]} />

      {/* Power tower - fly through the wires */}
      <PowerTower position={[60, 0, -100]} />
      <PowerTower position={[-60, 0, -100]} />

      {/* === STRUCTURES === */}

      {/* Pit area buildings */}
      <Building position={[40, 0, 20]} size={[12, 4, 8]} color="#555" />
      <Building position={[55, 0, 20]} size={[8, 6, 8]} color="#444" />

      {/* Spectator bleachers */}
      <Bleachers position={[0, 0, 25]} rotation={[0, Math.PI, 0]} />
      <Bleachers position={[-50, 0, -30]} rotation={[0, Math.PI / 2, 0]} />

      {/* Flag poles for visual reference */}
      <FlagPole position={[0, 0, -10]} height={8} color="#ff0000" />
      <FlagPole position={[10, 0, -10]} height={8} color="#ffffff" />
      <FlagPole position={[-10, 0, -10]} height={8} color="#0000ff" />

      {/* Corner markers */}
      <FlagPole position={[40, 0, -90]} height={12} color="#ff6600" />
      <FlagPole position={[-45, 0, -80]} height={12} color="#ff6600" />

      {/* === DISTANT ENVIRONMENT === */}

      {/* Trees around the area */}
      {treePositions.map((pos, i) => (
        <Tree key={i} position={pos} scale={0.8 + Math.random() * 0.8} />
      ))}

      {/* Distant mountains/hills */}
      <mesh position={[0, 20, -250]} receiveShadow>
        <coneGeometry args={[80, 60, 8]} />
        <meshStandardMaterial color="#3a5a3a" roughness={1} />
      </mesh>
      <mesh position={[-100, 15, -220]} receiveShadow>
        <coneGeometry args={[60, 45, 8]} />
        <meshStandardMaterial color="#4a6a4a" roughness={1} />
      </mesh>
      <mesh position={[120, 25, -230]} receiveShadow>
        <coneGeometry args={[70, 55, 8]} />
        <meshStandardMaterial color="#3a5a3a" roughness={1} />
      </mesh>

      {/* Boundary walls (visual reference) */}
      <mesh position={[0, 1, -200]} receiveShadow>
        <boxGeometry args={[400, 2, 1]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
      <mesh position={[150, 1, -50]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[300, 2, 1]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
      <mesh position={[-150, 1, -50]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[300, 2, 1]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>
    </group>
  );
};
