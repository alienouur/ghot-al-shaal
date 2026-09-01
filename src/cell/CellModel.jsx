import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';

/*
 * Replica of a physical educational cell cross-section model:
 * frosted upright resin disc with a thin teal rim on a black stand.
 * - Mint-green blobby rough ER (with white bound-ribosome dots) hugging the
 *   nucleus and running up the right side.
 * - Navy squiggly smooth ER ribbons (no dots).
 * - White cutaway nucleus with teal interior, amber nucleolus, blue pores.
 * - Red/pink concentric Golgi arcs with vesicles (upper middle).
 * - Orange mitochondria with dark interiors and orange cristae squiggles.
 * - Yellow/red ringed lysosome beads.
 * - Tiny white free-ribosome dots scattered on the disc.
 * Every selectable mesh carries userData.structureId; R3F raycast events with
 * stopPropagation make the front-most object win (ribosomes over rough ER).
 */

const DISC_RADIUS = 5;
const DISC_THICKNESS = 0.45;
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
      roughness={0.22}
      metalness={0.05}
      emissive={highlight ? '#4dd7ff' : '#000000'}
      emissiveIntensity={highlight ? 0.55 : 0}
      {...extra}
    />
  );
}

function makeCurve(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
}

function TubeMesh({ curve, radius, color, hl, id, segments = 80, closed = false }) {
  const geom = useMemo(
    () => new THREE.TubeGeometry(curve, segments, radius, 12, closed),
    [curve, radius, segments, closed]
  );
  return (
    <mesh userData={{ structureId: id }} geometry={geom}>
      {glossy(color, hl)}
    </mesh>
  );
}

function Blob({ position, scale, color, hl, id }) {
  return (
    <mesh userData={{ structureId: id }} position={position} scale={scale}>
      <sphereGeometry args={[1, 20, 16]} />
      {glossy(color, hl)}
    </mesh>
  );
}

/* ---------- Disc + black stand (not selectable) ---------- */
function Disc() {
  return (
    <group>
      <mesh raycast={noRaycast} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, DISC_THICKNESS, 96]} />
        <meshPhysicalMaterial
          color="#dfe9ee"
          transparent
          opacity={0.3}
          roughness={0.35}
          transmission={0.55}
          thickness={0.5}
          clearcoat={0.8}
          clearcoatRoughness={0.35}
          iridescence={0.35}
          depthWrite={false}
        />
      </mesh>
      {/* black stand: base + two curved arms */}
      <mesh raycast={noRaycast} position={[0, -DISC_RADIUS - 0.45, 0]}>
        <boxGeometry args={[4.6, 0.35, 1.8]} />
        <meshStandardMaterial color="#151515" roughness={0.6} />
      </mesh>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} raycast={noRaycast} position={[x, -DISC_RADIUS + 0.35, 0]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]}>
          <boxGeometry args={[0.35, 1.9, 1.2]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Plasma membrane: thin teal rim ---------- */
function PlasmaMembrane({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('plasma_membrane', hovered, flash);
  return (
    <Selectable id="plasma_membrane" onSelect={onSelect} onHover={onHover}>
      <mesh userData={{ structureId: 'plasma_membrane' }}>
        <torusGeometry args={[DISC_RADIUS, 0.24, 20, 128]} />
        {glossy('#5fc7b4', hl)}
      </mesh>
    </Selectable>
  );
}

/* ---------- Nucleus: white cutaway sphere, teal interior, amber nucleolus ---------- */
function Nucleus({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('nucleus', hovered, flash);
  const dots = useMemo(() => {
    const list = [];
    for (let i = 0; i < 26; i++) {
      const theta = (i * 2.39996) % (Math.PI * 2); // golden angle spiral
      const phi = 0.5 + (i / 26) * 2.1;
      const r = 1.52;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      if (z > -0.2 && !(x > 0 && z > 0.4)) list.push([x, y, z]);
    }
    return list;
  }, []);
  return (
    <Selectable id="nucleus" onSelect={onSelect} onHover={onHover}>
      {/* opening faces the viewer slightly right, like the photo */}
      <group position={[0.1, -0.7, FACE_Z + 0.9]} rotation={[0.1, -0.15, 0]}>
        {/* white envelope with cutaway window facing the viewer */}
        <mesh
          userData={{ structureId: 'nucleus' }}
          rotation={[0, 2.4, 0]}
        >
          <sphereGeometry args={[1.55, 48, 32, 0, Math.PI * 1.55]} />
          <meshStandardMaterial
            color="#f3ece6"
            roughness={0.28}
            side={THREE.DoubleSide}
            emissive={hl ? '#4dd7ff' : '#000000'}
            emissiveIntensity={hl ? 0.55 : 0}
          />
        </mesh>
        {/* pale teal interior */}
        <mesh userData={{ structureId: 'nucleus' }}>
          <sphereGeometry args={[1.3, 32, 24]} />
          {glossy('#b7d4c6', hl, { roughness: 0.4 })}
        </mesh>
        {/* amber nucleolus resting in the opening */}
        <mesh userData={{ structureId: 'nucleus' }} position={[0.35, 0.05, 1.15]}>
          <sphereGeometry args={[0.52, 32, 24]} />
          <meshPhysicalMaterial
            color="#8a4a12"
            roughness={0.15}
            clearcoat={1}
            transparent
            opacity={0.92}
            emissive={hl ? '#4dd7ff' : '#2a1200'}
            emissiveIntensity={hl ? 0.55 : 0.25}
          />
        </mesh>
        {/* small blue pore marks on the white envelope */}
        {dots.map((p, i) =>
          i % 3 === 0 ? (
            <mesh
              key={i}
              userData={{ structureId: 'nucleus' }}
              position={p}
              scale={[0.09, 0.16, 0.05]}
            >
              <boxGeometry args={[1, 1, 1]} />
              {glossy('#2b3f9e', hl)}
            </mesh>
          ) : (
            <mesh key={i} userData={{ structureId: 'nucleus' }} position={p}>
              <sphereGeometry args={[0.045, 8, 6]} />
              {glossy('#ffffff', hl)}
            </mesh>
          )
        )}
      </group>
    </Selectable>
  );
}

/* ---------- Rough ER: mint-green blobby branches with white dots ---------- */
const ROUGH_ER_CURVES = [
  // collar hugging the nucleus (top-left arc)
  [
    [-1.9, 0.4, 0], [-1.4, 1.0, 0.05], [-0.5, 1.3, 0], [0.5, 1.2, 0.05], [1.3, 0.7, 0],
  ],
  // branch from collar up-left
  [
    [-1.6, 0.8, 0], [-2.3, 1.3, 0.05], [-2.9, 1.1, 0],
  ],
  // big branchy band running up the right side
  [
    [1.5, -1.6, 0], [2.3, -0.6, 0.05], [2.6, 0.6, 0], [2.9, 1.8, 0.05], [2.7, 3.0, 0], [3.2, 3.9, 0],
  ],
  [
    [2.6, 0.6, 0], [3.4, 0.9, 0.05], [3.9, 0.5, 0],
  ],
  [
    [2.9, 1.8, 0], [3.6, 2.1, 0.05], [4.1, 1.8, 0],
  ],
  [
    [2.3, -0.6, 0], [3.1, -0.9, 0.05], [3.7, -1.5, 0],
  ],
  // lower-right drooping branch
  [
    [1.5, -1.6, 0], [1.9, -2.4, 0.05], [2.7, -2.8, 0], [3.4, -2.6, 0.05],
  ],
];

const ROUGH_ER_BLOBS = [
  { position: [-2.9, 1.1, 0], scale: [0.42, 0.3, 0.25] },
  { position: [3.2, 3.9, 0], scale: [0.5, 0.38, 0.25] },
  { position: [3.9, 0.5, 0], scale: [0.38, 0.3, 0.25] },
  { position: [4.1, 1.8, 0], scale: [0.35, 0.28, 0.25] },
  { position: [3.4, -2.6, 0], scale: [0.48, 0.34, 0.25] },
  { position: [3.7, -1.5, 0], scale: [0.34, 0.28, 0.25] },
];

function RoughER({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('rough_er', hovered, flash);
  const curves = useMemo(() => ROUGH_ER_CURVES.map(makeCurve), []);
  return (
    <Selectable id="rough_er" onSelect={onSelect} onHover={onHover}>
      <group position={[0, -0.5, FACE_Z + 0.18]}>
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.24} color="#7fd0b8" hl={hl} id="rough_er" />
        ))}
        {ROUGH_ER_BLOBS.map((b, i) => (
          <Blob key={i} {...b} color="#7fd0b8" hl={hl} id="rough_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Bound ribosomes: white dots ON the rough ER ---------- */
function BoundRibosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('bound_ribosomes', hovered, flash);
  const dots = useMemo(() => {
    const curves = ROUGH_ER_CURVES.map(makeCurve);
    const list = [];
    curves.forEach((curve, ci) => {
      const step = ci === 2 ? 0.07 : 0.12;
      for (let t = 0.06; t < 1; t += step) {
        const p = curve.getPoint(t);
        const jx = Math.sin(t * 37 + ci) * 0.08;
        const jy = Math.cos(t * 51 + ci) * 0.08;
        list.push([p.x + jx, p.y + jy, p.z + 0.24]);
      }
    });
    return list;
  }, []);
  return (
    <Selectable id="bound_ribosomes" onSelect={onSelect} onHover={onHover}>
      <group position={[0, -0.5, FACE_Z + 0.18]}>
        {dots.map((p, i) => (
          <group key={i} position={p}>
            <mesh userData={{ structureId: 'bound_ribosomes' }}>
              <sphereGeometry args={[0.07, 10, 8]} />
              {glossy('#ffffff', hl)}
            </mesh>
            {/* larger invisible hit target so taps prefer the ribosome */}
            <mesh userData={{ structureId: 'bound_ribosomes' }} visible={false}>
              <sphereGeometry args={[0.15, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Smooth ER: navy squiggly ribbons, NO dots ---------- */
function SmoothER({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('smooth_er', hovered, flash);
  const curves = useMemo(
    () =>
      [
        // upper-left branching squiggle cluster
        [
          [-3.3, 1.6, 0], [-2.7, 2.0, 0.05], [-2.1, 1.6, 0], [-1.6, 2.1, 0.05], [-1.1, 1.7, 0],
        ],
        [
          [-2.7, 0.6, 0], [-2.1, 1.0, 0.05], [-1.5, 0.6, 0], [-0.9, 1.0, 0.05],
        ],
        // left blobby branches
        [
          [-4.0, -0.6, 0], [-3.3, -0.3, 0.05], [-2.7, -0.8, 0], [-2.1, -0.5, 0.05], [-1.6, -1.0, 0],
        ],
        [
          [-3.3, -0.3, 0], [-3.1, -1.2, 0.05], [-3.5, -1.8, 0],
        ],
        // long serpentine wave along the bottom
        [
          [-2.6, -2.6, 0], [-1.9, -2.1, 0.05], [-1.2, -2.7, 0], [-0.5, -2.1, 0.05],
          [0.2, -2.8, 0], [0.9, -2.2, 0.05], [1.4, -3.0, 0], [0.7, -3.6, 0.05], [-0.2, -3.4, 0],
        ],
        // vertical squiggles near the top
        [
          [1.8, 4.4, 0], [2.0, 3.7, 0.05], [1.8, 3.0, 0],
        ],
        [
          [-2.5, 4.1, 0], [-2.2, 3.5, 0.05], [-2.5, 2.9, 0],
        ],
      ].map(makeCurve),
    []
  );
  return (
    <Selectable id="smooth_er" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.16]}>
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.16} color="#1c2a6b" hl={hl} id="smooth_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Golgi: red/pink concentric arcs + vesicles ---------- */
function Golgi({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('golgi_complex', hovered, flash);
  const arcs = [0.55, 0.85, 1.15, 1.45, 1.75];
  const vesicles = [
    [-1.1, 0.9, 0], [1.2, 1.0, 0], [-1.5, -0.3, 0], [1.6, -0.2, 0], [0.1, 1.35, 0],
  ];
  return (
    <Selectable id="golgi_complex" onSelect={onSelect} onHover={onHover}>
      <group position={[-0.5, 2.5, FACE_Z + 0.16]}>
        {arcs.map((r, i) => (
          <mesh
            key={i}
            userData={{ structureId: 'golgi_complex' }}
            rotation={[0, 0, Math.PI * 0.18]}
          >
            <torusGeometry args={[r, 0.13, 12, 48, Math.PI * 0.64]} />
            {glossy('#d5495a', hl)}
          </mesh>
        ))}
        {vesicles.map((p, i) => (
          <mesh key={i} userData={{ structureId: 'golgi_complex' }} position={p}>
            <sphereGeometry args={[0.16, 14, 10]} />
            {glossy('#d5495a', hl)}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Mitochondria: orange ovals, dark interior, cristae squiggle ---------- */
function Mitochondrion({ position, rotation = 0, scale = 1, hl }) {
  const cristaeCurve = useMemo(
    () =>
      makeCurve([
        [-0.55, 0.12, 0], [-0.3, -0.12, 0.02], [-0.05, 0.12, 0], [0.2, -0.12, 0.02], [0.45, 0.1, 0],
      ]),
    []
  );
  return (
    <group position={position} rotation={[0, 0, rotation]} scale={scale}>
      {/* orange outer body */}
      <mesh userData={{ structureId: 'mitochondria' }} scale={[1, 0.55, 0.4]}>
        <sphereGeometry args={[0.95, 32, 24]} />
        {glossy('#e8531f', hl)}
      </mesh>
      {/* dark interior */}
      <mesh userData={{ structureId: 'mitochondria' }} scale={[0.78, 0.38, 0.42]} position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.95, 24, 18]} />
        {glossy('#2e1c12', hl, { roughness: 0.35 })}
      </mesh>
      {/* orange cristae squiggle on the dark interior */}
      <group position={[0.05, 0, 0.42]} scale={[1.15, 1.15, 1]}>
        <TubeMesh
          curve={cristaeCurve}
          radius={0.055}
          color="#e8531f"
          hl={hl}
          id="mitochondria"
          segments={40}
        />
      </group>
    </group>
  );
}

function Mitochondria({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('mitochondria', hovered, flash);
  return (
    <Selectable id="mitochondria" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.22]}>
        <Mitochondrion position={[1.6, 4.0, 0]} rotation={0.35} scale={0.9} hl={hl} />
        <Mitochondrion position={[-1.7, 3.1, 0]} rotation={1.15} scale={0.85} hl={hl} />
        <Mitochondrion position={[-3.6, 1.0, 0]} rotation={-0.5} scale={0.95} hl={hl} />
        <Mitochondrion position={[-4.1, -0.1, 0]} rotation={1.3} scale={0.6} hl={hl} />
        <Mitochondrion position={[-1.3, -1.6, 0]} rotation={0.5} scale={0.65} hl={hl} />
      </group>
    </Selectable>
  );
}

/* ---------- Lysosomes: ringed yellow/red beads ---------- */
function Lysosome({ position, core, ring, hl, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh userData={{ structureId: 'lysosome' }} scale={[1, 1, 0.55]}>
        <sphereGeometry args={[0.32, 24, 18]} />
        {glossy(core, hl, { roughness: 0.12 })}
      </mesh>
      <mesh userData={{ structureId: 'lysosome' }}>
        <torusGeometry args={[0.34, 0.09, 12, 32]} />
        {glossy(ring, hl, { roughness: 0.12 })}
      </mesh>
    </group>
  );
}

function Lysosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('lysosome', hovered, flash);
  return (
    <Selectable id="lysosome" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.2]}>
        <Lysosome position={[-4.0, 2.0, 0]} core="#e33d24" ring="#f4c430" hl={hl} />
        <Lysosome position={[-3.0, 3.2, 0]} core="#f0641e" ring="#f0641e" hl={hl} scale={0.8} />
        <Lysosome position={[0.9, -4.2, 0]} core="#f4c430" ring="#f4c430" hl={hl} />
        <Lysosome position={[2.4, -3.9, 0]} core="#e33d24" ring="#f4c430" hl={hl} scale={0.85} />
        <Lysosome position={[-4.2, -1.6, 0]} core="#f0641e" ring="#f4c430" hl={hl} scale={0.75} />
      </group>
    </Selectable>
  );
}

/* ---------- Free ribosomes: white dots scattered on the disc ---------- */
function FreeRibosomes({ hovered, flash, onSelect, onHover }) {
  const hl = useHighlight('free_ribosomes', hovered, flash);
  const dots = useMemo(() => {
    const list = [];
    const seed = { v: 42 };
    const rand = () => {
      seed.v = (seed.v * 16807) % 2147483647;
      return seed.v / 2147483647;
    };
    // dense cluster lower-left of the nucleus, like the photo
    let attempts = 0;
    while (list.length < 18 && attempts < 300) {
      attempts++;
      const x = -2.6 + rand() * 1.9;
      const y = -2.6 + rand() * 1.9;
      if (x * x + y * y < DISC_RADIUS * DISC_RADIUS * 0.8) list.push([x, y, 0]);
    }
    // sparse scatter elsewhere
    attempts = 0;
    while (list.length < 40 && attempts < 600) {
      attempts++;
      const a = rand() * Math.PI * 2;
      const r = 1.5 + rand() * 3.1;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const clearOf = (cx, cy, d) => (x - cx) ** 2 + (y - cy) ** 2 > d * d;
      if (
        clearOf(0.1, -0.7, 2.1) && // nucleus
        clearOf(2.8, 0.6, 1.4) && // rough ER band
        clearOf(-0.3, 2.3, 1.9) && // golgi
        clearOf(-1.7, 3.1, 1.0) &&
        clearOf(-3.6, 1.0, 1.0) &&
        clearOf(1.6, 4.0, 1.0) // mitochondria
      ) {
        list.push([x, y, 0]);
      }
    }
    return list;
  }, []);
  return (
    <Selectable id="free_ribosomes" onSelect={onSelect} onHover={onHover}>
      <group position={[0, 0, FACE_Z + 0.12]}>
        {dots.map((p, i) => (
          <group key={i} position={p}>
            <mesh userData={{ structureId: 'free_ribosomes' }}>
              <sphereGeometry args={[0.07, 10, 8]} />
              {glossy('#ffffff', hl)}
            </mesh>
            <mesh userData={{ structureId: 'free_ribosomes' }} visible={false}>
              <sphereGeometry args={[0.16, 8, 6]} />
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
