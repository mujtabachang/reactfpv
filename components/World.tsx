import React from 'react';
import * as THREE from 'three';

export const Ground = () => {
  // Simple grid ground
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
  );
};

export const GridFloor = () => {
    return <gridHelper args={[1000, 100, 0x444444, 0x222222]} position={[0, 0, 0]} />;
}

const Gate = ({ position, rotation = [0, 0, 0], scale = 1 }: { position: [number, number, number], rotation?: [number, number, number], scale?: number }) => {
  return (
    <group position={position} rotation={rotation as any} scale={scale}>
      {/* Outer frame */}
      <mesh castShadow receiveShadow>
        <torusGeometry args={[2.5, 0.2, 16, 32]} />
        <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
      </mesh>
      {/* Inner glow (fake) */}
      <pointLight distance={5} intensity={2} color="orange" />
    </group>
  );
};

const CubeObstacle = ({ position, size }: { position: [number, number, number], size: [number, number, number] }) => {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#333" roughness={0.5} />
        </mesh>
    )
}

export const Environment = () => {
  return (
    <group>
        <ambientLight intensity={0.5} />
        <directionalLight
            position={[50, 100, 50]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
        />

        <Ground />
        <GridFloor />

        {/* Racing Gates Track */}
        <Gate position={[0, 5, -20]} />
        <Gate position={[10, 8, -50]} rotation={[0, -0.5, 0]} />
        <Gate position={[20, 5, -80]} rotation={[0, -1, 0]} />
        <Gate position={[0, 15, -100]} rotation={[Math.PI/2, 0, 0]} scale={2} />
        <Gate position={[-30, 5, -80]} rotation={[0, 1, 0]} />
        <Gate position={[-40, 10, -40]} rotation={[0, 0.5, 0]} />

        {/* Obstacles */}
        <CubeObstacle position={[-15, 2, -15]} size={[4, 4, 4]} />
        <CubeObstacle position={[15, 2, -15]} size={[4, 4, 4]} />
        <CubeObstacle position={[0, 2, -60]} size={[2, 4, 10]} />
        <CubeObstacle position={[30, 10, -30]} size={[5, 20, 5]} />
        <CubeObstacle position={[-30, 10, -30]} size={[5, 20, 5]} />

        {/* Distant mountains/structures for reference */}
        <CubeObstacle position={[0, 0, 200]} size={[400, 50, 50]} />
        <CubeObstacle position={[200, 0, 0]} size={[50, 50, 400]} />
        <CubeObstacle position={[-200, 0, 0]} size={[50, 50, 400]} />
    </group>
  );
};
