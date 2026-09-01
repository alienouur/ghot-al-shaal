import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import CellModel from './CellModel';

const DEFAULT_POS = new THREE.Vector3(0, 0.5, 12);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

function CameraRig({ resetSignal, controlsRef }) {
  const { camera } = useThree();
  const animatingRef = useRef(false);
  const lastSignal = useRef(0);

  useFrame(() => {
    if (resetSignal !== lastSignal.current) {
      lastSignal.current = resetSignal;
      animatingRef.current = true;
    }
    if (!animatingRef.current) return;
    camera.position.lerp(DEFAULT_POS, 0.12);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerp(DEFAULT_TARGET, 0.12);
      controls.update();
    }
    if (camera.position.distanceTo(DEFAULT_POS) < 0.05) {
      camera.position.copy(DEFAULT_POS);
      if (controls) controls.target.copy(DEFAULT_TARGET);
      animatingRef.current = false;
    }
  });
  return null;
}

export default function CellScene({ onSelect, flashId, interactive, resetSignal }) {
  const controlsRef = useRef();
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: DEFAULT_POS.toArray(), fov: 45 }}
      style={{ touchAction: 'none' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 8, 10]} intensity={1.1} />
      <directionalLight position={[-6, -3, 6]} intensity={0.35} />
      <Suspense fallback={null}>
        <CellModel onSelect={onSelect} flashId={flashId} interactive={interactive} />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        rotateSpeed={0.7}
      />
      <CameraRig resetSignal={resetSignal} controlsRef={controlsRef} />
    </Canvas>
  );
}
