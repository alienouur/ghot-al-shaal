import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';

/*
 * Educational "resin disc" cell model.
 * The disc stands upright (flat faces toward +Z / camera).
 * Every selectable mesh carries userData.structureId; selection uses
 * R3F's raycast events with stopPropagation so the front-most object wins
 * (bound ribosomes sit on top of the rough ER and take priority).
 */

const DISC_RADIUS = 5;
const DISC_THICKNESS = 0.6;
const FACE_Z = DISC_THICKNESS / 2;

const noRaycast = () => {};

function useHighlight(id, hoveredId, flashId) {
  return hoveredId === id || flashId === id;
}

function Selectable({ id, onSelect, onHover, children }) {
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect(id);
    },
    [id, onSelect]
  );
  const handleOver = useCallback(
    (e) => {
      e.stopPropagation();
      onHover(id);
      document.body.style.cursor = 'pointer';
    },
    [id, onHover]
  );
  const handleOut = useCallback(() => {
    onHover(null);
    document.body.style.cursor = 'auto';
  }, [onHover]);
  return (
    <group
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      userData={{ structureId: id }}
    >
      {children}
    </group>
  );
}

function glossy(color, highlight, extra = {}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.25}
      metalness={0.05}
      emissive={highlight ? '#4dd7ff' : '#000000'}
      emissiveIntensity={highlight ? 0.55 : 0}
      {...extra}
    />
  );
}

/* ---------- Disc (not selectable) ---------- */
function Disc() {
  return (
    <group>
      <mesh raycast={noRaycast} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, DISC_THICKNESS, 96]} />
        <meshPhysicalMaterial
          color="#bfe3ee"
          transparent
          opacity={0.18}
          roughness={0.05}
          transmission={0.6}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          depthWrite={false}
        />
      </mesh>
      {/* stand */}
      <mesh raycast={noRaycast} position={[0, -DISC_RADIUS - 0.5, 0]}>
        <cylinderGeometry args={[1.6, 2.1, 0.5, 48]} />
        <meshStandardMaterial color="#22303c" roughness={0.4} />
      </mesh>
      <mesh raycast={noRaycast} position={[0, -DISC_RADIUS - 0.05, 0]}>
        <boxGeometry args={[1.2, 0.9, 0.9]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ---------- Plasma membrane: outer rim torus ---------- */
function PlasmaMembrane({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('plasma_membrane', hovered, flash);
  return (
    <Selectable id="plasma_membrane" onSelect={onSelect} onHover={onHover}>
      <mesh userData={{ structureId: 'plasma_membrane' }}>
        <torusGeometry args={[DISC_RADIUS, 0.38, 24, 128]} />
        {glossy('#7fd4a8', hl)}
      </mesh>
    </Selectable>
  );
}

/* ---------- Nucleus: white dome + pores + cutaway nucleolus ---------- */
function Nucleus({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('nucleus', hovered, flash);
  const pores = useMemo(() => {
    const list = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      list.push([Math.cos(a) * 1.05, Math.sin(a) * 1.05]);
    }
    return list;
  }, []);
  return (
    <Selectable id="nucleus" onSelect={onSelect} onHover={onHover}>
      <group position={[-0.4, 0.3, FACE_Z]}>
        {/* dome body with transparent window */}
        <mesh userData={{ structureId: 'nucleus' }} scale={[1, 1, 0.55]}>
          <sphereGeometry args={[1.5, 48, 32]} />
          <meshPhysicalMaterial
            color="#f2f2ee"
            roughness={0.3}
            transparent
            opacity={0.82}
            clearcoat={0.6}
            emissive={hl ? '#4dd7ff' : '#000000'}
            emissiveIntensity={hl ? 0.55 : 0}
          />
        </mesh>
        {/* orange nucleolus visible inside */}
        <mesh userData={{ structureId: 'nucleus' }} position={[0.15, 0.1, 0.25]}>
          <sphereGeometry args={[0.5, 32, 24]} />
          {glossy('#f28c28', hl)}
        </mesh>
        {/* blue-ringed nuclear pores */}
        {pores.map(([x, y], i) => (
          <mesh
            key={i}
            userData={{ structureId: 'nucleus' }}
            position={[x, y, 0.62 * Math.sqrt(Math.max(0, 1 - (x * x + y * y) / 2.25))]}
            rotation={[0, 0, 0]}
          >
            <torusGeometry args={[0.13, 0.045, 12, 24]} />
            {glossy('#2f6fd1', hl)}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Mitochondria: orange ovals with dark cristae ---------- */
function Mitochondrion({ position, rotation = 0, hl }) {
  const cristae = useMemo(() => [-0.35, -0.12, 0.12, 0.35], []);
  return (
    <group position={position} rotation={[0, 0, rotation]}>
      <mesh userData={{ structureId: 'mitochondria' }} scale={[1, 0.52, 0.45]}>
        <sphereGeometry args={[0.85, 32, 24]} />
        {glossy('#f2762e', hl)}
      </mesh>
      {cristae.map((x, i) => (
        <mesh
          key={i}
          userData={{ structureId: 'mitochondria' }}
          position={[x, 0, 0.3]}
          rotation={[0, 0, i % 2 ? 0.5 : -0.5]}
        >
          <boxGeometry args={[0.05, 0.5, 0.12]} />
          <meshStandardMaterial color="#26170e" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Mitochondria({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('mitochondria', hovered, flash);
  return (
    <Selectable id="mitochondria" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.25]}>
        <Mitochondrion position={[2.6, 2.2, 0]} rotation={-0.5} hl={hl} />
        <Mitochondrion position={[-3.2, -1.4, 0]} rotation={0.8} hl={hl} />
        <Mitochondrion position={[0.6, -3.4, 0]} rotation={0.15} hl={hl} />
      </group>
    </Selectable>
  );
}

/* ---------- ER helpers ---------- */
function makeWaveCurve(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
}

function TubeMesh({ curve, radius, color, hl, id, segments = 64 }) {
  const geom = useMemo(
    () => new THREE.TubeGeometry(curve, segments, radius, 12, false),
    [curve, radius, segments]
  );
  return (
    <mesh userData={{ structureId: id }} geometry={geom}>
      {glossy(color, hl)}
    </mesh>
  );
}

/* ---------- Rough ER: navy folded ribbons near nucleus ---------- */
const ROUGH_ER_CURVES = [
  [
    [-3.2, 1.2, 0], [-2.6, 2.0, 0.1], [-1.9, 1.3, 0], [-1.3, 2.1, 0.1], [-0.7, 1.5, 0],
  ],
  [
    [-3.4, 0.4, 0], [-2.7, 1.1, 0.1], [-2.0, 0.4, 0], [-1.3, 1.1, 0.1], [-0.6, 0.5, 0],
  ],
  [
    [-3.3, -0.5, 0], [-2.6, 0.1, 0.1], [-1.9, -0.5, 0], [-1.2, 0.1, 0.1], [-0.6, -0.4, 0],
  ],
];

function RoughER({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('rough_er', hovered, flash);
  const curves = useMemo(() => ROUGH_ER_CURVES.map(makeWaveCurve), []);
  return (
    <Selectable id="rough_er" onSelect={onSelect} onHover={onHover}>
      <group position={[0.1, 0.4, FACE_Z + 0.2]}>
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.17} color="#1b2f6e" hl={hl} id="rough_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Bound ribosomes: white dots ON the rough ER ---------- */
function BoundRibosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('bound_ribosomes', hovered, flash);
  const dots = useMemo(() => {
    const curves = ROUGH_ER_CURVES.map(makeWaveCurve);
    const list = [];
    curves.forEach((curve) => {
      for (let t = 0.05; t < 1; t += 0.09) {
        const p = curve.getPoint(t);
        list.push([p.x, p.y, p.z + 0.19]);
      }
    });
    return list;
  }, []);
  return (
    <Selectable id="bound_ribosomes" onSelect={onSelect} onHover={onHover}>
      <group position={[0.1, 0.4, FACE_Z + 0.2]}>
        {dots.map((p, i) => (
          <group key={i} position={p}>
            <mesh userData={{ structureId: 'bound_ribosomes' }}>
              <sphereGeometry args={[0.09, 12, 10]} />
              {glossy('#ffffff', hl)}
            </mesh>
            {/* larger invisible hit target so taps prefer the ribosome */}
            <mesh userData={{ structureId: 'bound_ribosomes' }} visible={false}>
              <sphereGeometry args={[0.17, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Smooth ER: teal branching tubes, NO dots ---------- */
function SmoothER({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('smooth_er', hovered, flash);
  const curves = useMemo(
    () =>
      [
        [
          [1.4, 1.0, 0], [2.0, 1.4, 0.1], [2.7, 1.0, 0], [3.3, 1.4, 0.1],
        ],
        [
          [1.5, 0.4, 0], [2.2, 0.7, 0.1], [2.9, 0.3, 0], [3.5, 0.6, 0],
        ],
        [
          [1.6, 1.0, 0], [1.9, 0.6, 0.1], [1.6, 0.3, 0],
        ],
        [
          [2.8, 1.05, 0], [3.0, 0.7, 0.1], [2.85, 0.35, 0],
        ],
      ].map(makeWaveCurve),
    []
  );
  return (
    <Selectable id="smooth_er" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0.5, FACE_Z + 0.2]}>
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.14} color="#39c6c0" hl={hl} id="smooth_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Golgi: pink curved parallel flattened sacs ---------- */
function Golgi({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('golgi_complex', hovered, flash);
  const sacs = [0, 1, 2, 3];
  return (
    <Selectable id="golgi_complex" onSelect={onSelect} onHover={onHover}>
      <group position={[-1.6, -2.4, FACE_Z + 0.2]} rotation={[0, 0, 0.4]}>
        {sacs.map((i) => (
          <mesh
            key={i}
            userData={{ structureId: 'golgi_complex' }}
            position={[0, i * 0.42 - 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[1 + i * 0.12, 1 + i * 0.12, 1]}
          >
            <torusGeometry args={[1.0, 0.13, 12, 48, Math.PI]} />
            {glossy('#e75480', hl)}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Lysosomes: small glossy yellow beads ---------- */
function Lysosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('lysosome', hovered, flash);
  const positions = [
    [3.6, -1.6, 0],
    [2.9, -2.5, 0],
    [-3.9, 1.0, 0],
  ];
  return (
    <Selectable id="lysosome" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.25]}>
        {positions.map((p, i) => (
          <mesh key={i} userData={{ structureId: 'lysosome' }} position={p}>
            <sphereGeometry args={[0.34, 24, 18]} />
            {glossy('#f4c430', hl, { roughness: 0.15 })}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Free ribosomes: white dots scattered on the disc ---------- */
function FreeRibosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('free_ribosomes', hovered, flash);
  const dots = useMemo(() => {
    const list = [];
    const rng = (seed) => {
      // deterministic pseudo-random so layout is stable
      let s = seed;
      return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
    };
    const rand = rng(42);
    let attempts = 0;
    while (list.length < 22 && attempts < 400) {
      attempts++;
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * 3.2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      // keep away from major organelles
      const clearOf = (cx, cy, d) => (x - cx) ** 2 + (y - cy) ** 2 > d * d;
      if (
        clearOf(-0.4, 0.3, 2.0) && // nucleus
        clearOf(-2.0, 1.2, 1.6) && // rough ER
        clearOf(2.4, 1.2, 1.5) && // smooth ER
        clearOf(-1.6, -2.4, 1.6) && // golgi
        clearOf(2.6, 2.2, 1.1) &&
        clearOf(-3.2, -1.4, 1.1) &&
        clearOf(0.6, -3.4, 1.1) && // mitochondria
        clearOf(3.6, -1.6, 0.7) &&
        clearOf(2.9, -2.5, 0.7) &&
        clearOf(-3.9, 1.0, 0.7) // lysosomes
      ) {
        list.push([x, y, 0]);
      }
    }
    return list;
  }, []);
  return (
    <Selectable id="free_ribosomes" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.15]}>
        {dots.map((p, i) => (
          <group key={i} position={p}>
            <mesh userData={{ structureId: 'free_ribosomes' }}>
              <sphereGeometry args={[0.09, 12, 10]} />
              {glossy('#ffffff', hl)}
            </mesh>
            <mesh userData={{ structureId: 'free_ribosomes' }} visible={false}>
              <sphereGeometry args={[0.18, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
    </Selectable>
  );
}

export default function CellModel({ onSelect, flashId, interactive = true }) {
  const [hovered, setHovered] = useState(null);
  const handleSelect = useCallback(
    (id) => {
      if (interactive) onSelect(id);
    },
    [interactive, onSelect]
  );
  const handleHover = useCallback(
    (id) => setHovered(interactive ? id : null),
    [interactive]
  );
  const common = { hovered, flash: flashId, onSelect: handleSelect, onHover: handleHover };
  return (
    <group>
      <Disc />
      <PlasmaMembrane {...common} />
      <Nucleus {...common} />
      <Mitochondria {...common} />
      <RoughER {...common} />
      <BoundRibosomes {...common} />
      <SmoothER {...common} />
      <Golgi {...common} />
      <Lysosomes {...common} />
      <FreeRibosomes {...common} />
    </group>
  );
}
