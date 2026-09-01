import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import CellModel from './CellModel';
import { DEFAULT_LAYOUT } from './layout';

const DEFAULT_POS = new THREE.Vector3(0, 0.3, 14);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const DRAG_LIMIT = 4.6;

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

// Invisible full-scene plane that receives pointer moves while dragging a unit.
function DragPlane({ dragRef, controlsRef, onMoveUnit }) {
  const endDrag = () => {
    dragRef.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  };
  return (
    <mesh
      position={[0, 0, 0.6]}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        e.stopPropagation();
        const x = THREE.MathUtils.clamp(e.point.x + drag.offX, -DRAG_LIMIT, DRAG_LIMIT);
        const y = THREE.MathUtils.clamp(e.point.y + drag.offY, -DRAG_LIMIT, DRAG_LIMIT);
        onMoveUnit(drag.unit, x, y);
      }}
      onPointerUp={endDrag}
    >
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function CellScene({
  onSelect,
  flashId,
  interactive,
  resetSignal,
  layout = DEFAULT_LAYOUT,
  editorApi = null, // { selected, onSelectUnit, onMoveUnit }
}) {
  const controlsRef = useRef();
  const dragRef = useRef(null);

  const editor = editorApi
    ? {
        selected: editorApi.selected,
        onPick: (unit, e) => {
          const u = layout[unit];
          dragRef.current = {
            unit,
            offX: u.x - e.point.x,
            offY: u.y - e.point.y,
          };
          if (controlsRef.current) controlsRef.current.enabled = false;
          editorApi.onSelectUnit(unit);
        },
      }
    : null;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: DEFAULT_POS.toArray(), fov: 45 }}
      style={{ touchAction: 'none' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerUp={() => {
        if (dragRef.current) {
          dragRef.current = null;
          if (controlsRef.current) controlsRef.current.enabled = true;
        }
      }}
    >
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 8, 10]} intensity={1.1} />
      <directionalLight position={[-6, -3, 6]} intensity={0.35} />
      <Suspense fallback={null}>
        <CellModel
          onSelect={onSelect}
          flashId={flashId}
          interactive={interactive}
          layout={layout}
          editor={editor}
        />
      </Suspense>
      {editorApi && (
        <DragPlane
          dragRef={dragRef}
          controlsRef={controlsRef}
          onMoveUnit={editorApi.onMoveUnit}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableRotate={!editorApi}
        minDistance={5}
        maxDistance={20}
        rotateSpeed={0.7}
      />
      <CameraRig resetSignal={resetSignal} controlsRef={controlsRef} />
    </Canvas>
  );
}
