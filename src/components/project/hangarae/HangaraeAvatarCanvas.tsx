"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";

const pointPairs = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 4],
  [4, 5],
  [5, 6],
  [1, 7],
  [7, 8],
  [8, 9],
  [7, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [12, 15],
  [15, 16],
  [14, 17],
] as const;

function SkeletonFigure() {
  const group = useRef<Group>(null);

  const points = useMemo(
    () =>
      [
        [0, 1.4, 0],
        [0, 1.1, 0],
        [-0.28, 1.18, 0],
        [-0.5, 0.92, 0],
        [0.28, 1.18, 0],
        [0.5, 0.92, 0],
        [0.62, 0.66, 0],
        [0, 0.68, 0],
        [-0.2, 0.22, 0],
        [-0.24, -0.24, 0],
        [0.2, 0.22, 0],
        [0.24, -0.24, 0],
        [0.26, -0.74, 0],
        [-0.28, -0.74, 0],
        [-0.26, -1.08, 0.06],
        [0.22, -1.1, 0.06],
        [0.3, -1.26, 0.16],
        [-0.18, -1.26, 0.16],
      ] as [number, number, number][],
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.45) * 0.2;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.9) * 0.04;
  });

  return (
    <group ref={group}>
      {pointPairs.map(([a, b]) => (
        <Line
          key={`${a}-${b}`}
          points={[points[a], points[b]]}
          color="#24C27A"
          lineWidth={2}
        />
      ))}
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[index === 0 ? 0.06 : 0.04, 20, 20]} />
          <meshStandardMaterial
            color={index < 14 ? "#E2FBEF" : "#24C27A"}
            emissive={index >= 14 ? "#0F8C56" : "#0B1728"}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

export function HangaraeAvatarCanvas() {
  return (
    <div className="h-[460px] w-full overflow-hidden rounded-[32px] border border-[rgba(36,194,122,0.14)] bg-[radial-gradient(circle_at_top,#17324D,#07111F_70%)]">
      <Canvas camera={{ position: [0, 0, 4.8], fov: 34 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 4]} intensity={1.4} />
        <SkeletonFigure />
      </Canvas>
    </div>
  );
}
