import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { DEFAULT_LAYOUT } from './layout';

/*
 * Physical educational cell cross-section model: frosted upright resin disc
 * with a rim (plasma membrane) on a black stand.
 * - Large raised white dome nucleus in the center with blue nuclear pores and
 *   an orange nucleolus visible through a cutaway window.
 * - Navy folded maze-like rough ER (left) with white bound-ribosome dots.
 * - Light teal branching smooth ER tubes (right), no dots.
 * - Pink curved stacked Golgi sacs (upper middle).
 * - Bright orange glossy mitochondria with dark zig-zag cristae.
 * - Small glossy yellow/red lysosome beads.
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

// In editor mode, attach a pointer-down handler that starts dragging a unit.
function pickProps(editor, unit) {
  if (!editor) return {};
  return {
    onPointerDown: (e) => {
      e.stopPropagation();
      editor.onPick(unit, e);
    },
  };
}

function Selectable({ id, onSelect, onHover, editor, children }) {
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
  // in editor mode, hover/click handlers would stopPropagation and block drags
  if (editor) {
    return <group userData={{ structureId: id }}>{children}</group>;
  }
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
function PlasmaMembrane({ hovered, flash, onSelect, onHover, editor }) {
  const hl = useHighlight('plasma_membrane', hovered, flash);
  return (
    <Selectable id="plasma_membrane" onSelect={onSelect} onHover={onHover} editor={editor}>
      <mesh userData={{ structureId: 'plasma_membrane' }}>
        <torusGeometry args={[DISC_RADIUS, 0.24, 20, 128]} />
        {glossy('#5fc7b4', hl)}
      </mesh>
    </Selectable>
  );
}

/* ---------- Nucleus: raised white dome, blue pores, orange nucleolus ---------- */
function Nucleus({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.nucleus;
  const hl = useHighlight('nucleus', hovered, flash) || editor?.selected === 'nucleus';
  const pores = useMemo(() => {
    const list = [];
    for (let i = 0; i < 22; i++) {
      const theta = (i * 2.39996) % (Math.PI * 2); // golden angle spiral
      const phi = 0.4 + (i / 22) * 1.9;
      const r = 1.55;
      const p = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      // keep pores on the visible front hemisphere, away from the window
      if (p.z < 0.4) continue;
      if (p.x > 0.4 && p.z > 0.9) continue;
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        p.clone().normalize()
      );
      list.push({ position: p.toArray(), quaternion: quat });
    }
    return list;
  }, []);
  return (
    <Selectable id="nucleus" onSelect={onSelect} onHover={onHover} editor={editor}>
      {/* raised dome in the center; window faces the viewer slightly right */}
      <group
        position={[u.x, u.y, FACE_Z + 0.9]}
        scale={u.s}
        rotation={[0.1, -0.15, 0]}
        {...pickProps(editor, 'nucleus')}
      >
        {/* white envelope with cutaway window facing the viewer */}
        <mesh
          userData={{ structureId: 'nucleus' }}
          rotation={[0, 2.4, 0]}
        >
          <sphereGeometry args={[1.55, 48, 32, 0, Math.PI * 1.55]} />
          <meshStandardMaterial
            color="#f5f2ec"
            roughness={0.25}
            side={THREE.DoubleSide}
            emissive={hl ? '#4dd7ff' : '#000000'}
            emissiveIntensity={hl ? 0.55 : 0}
          />
        </mesh>
        {/* pale interior */}
        <mesh userData={{ structureId: 'nucleus' }}>
          <sphereGeometry args={[1.3, 32, 24]} />
          {glossy('#ded6ca', hl, { roughness: 0.45 })}
        </mesh>
        {/* solid orange nucleolus visible through the window */}
        <mesh userData={{ structureId: 'nucleus' }} position={[0.35, 0.05, 1.05]}>
          <sphereGeometry args={[0.55, 32, 24]} />
          {glossy('#f28c28', hl, { roughness: 0.15 })}
        </mesh>
        {/* blue-ringed nuclear pores on the dome surface */}
        {pores.map((p, i) => (
          <mesh
            key={i}
            userData={{ structureId: 'nucleus' }}
            position={p.position}
            quaternion={p.quaternion}
          >
            <torusGeometry args={[0.11, 0.04, 10, 20]} />
            {glossy('#2f6fd1', hl)}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Rough ER: navy folded maze-like ribbons (left of nucleus) ---------- */
const ROUGH_ER_CURVES = [
  [
    [-3.6, 2.0, 0], [-3.1, 2.5, 0.05], [-2.6, 2.0, 0], [-2.1, 2.5, 0.05], [-1.7, 2.0, 0],
  ],
  [
    [-3.9, 1.2, 0], [-3.4, 1.7, 0.05], [-2.9, 1.2, 0], [-2.4, 1.7, 0.05], [-1.9, 1.2, 0],
  ],
  [
    [-4.1, 0.4, 0], [-3.6, 0.9, 0.05], [-3.1, 0.4, 0], [-2.6, 0.9, 0.05], [-2.1, 0.4, 0],
  ],
  [
    [-3.9, -0.4, 0], [-3.4, 0.1, 0.05], [-2.9, -0.4, 0], [-2.4, 0.1, 0.05], [-2.0, -0.4, 0],
  ],
  // connector fold
  [
    [-1.7, 2.0, 0], [-1.9, 1.6, 0.05], [-1.9, 1.2, 0],
  ],
];

function RoughER({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.rough_er;
  const hl = useHighlight('rough_er', hovered, flash) || editor?.selected === 'rough_er';
  const curves = useMemo(() => ROUGH_ER_CURVES.map(makeCurve), []);
  return (
    <Selectable id="rough_er" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.18]}
        scale={u.s}
        {...pickProps(editor, 'rough_er')}
      >
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.21} color="#1b2f6e" hl={hl} id="rough_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Bound ribosomes: white dots ON the rough ER ---------- */
function BoundRibosomes({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.rough_er; // bound ribosomes follow the rough ER
  const hl = useHighlight('bound_ribosomes', hovered, flash);
  const dots = useMemo(() => {
    const curves = ROUGH_ER_CURVES.map(makeCurve);
    const list = [];
    curves.forEach((curve, ci) => {
      const step = 0.09;
      for (let t = 0.05; t < 1; t += step) {
        const p = curve.getPoint(t);
        const jx = Math.sin(t * 37 + ci) * 0.08;
        const jy = Math.cos(t * 51 + ci) * 0.08;
        list.push([p.x + jx, p.y + jy, p.z + 0.24]);
      }
    });
    return list;
  }, []);
  return (
    <Selectable id="bound_ribosomes" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.18]}
        scale={u.s}
        {...pickProps(editor, 'rough_er')}
      >
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

/* ---------- Smooth ER: light teal branching tubes (right), NO dots ---------- */
const SMOOTH_ER_BLOBS = [
  { position: [3.2, 3.4, 0], scale: [0.42, 0.32, 0.22] },
  { position: [3.9, 0.1, 0], scale: [0.34, 0.27, 0.22] },
  { position: [4.1, 1.4, 0], scale: [0.32, 0.26, 0.22] },
  { position: [3.5, -2.9, 0], scale: [0.4, 0.3, 0.22] },
];

function SmoothER({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.smooth_er;
  const hl = useHighlight('smooth_er', hovered, flash) || editor?.selected === 'smooth_er';
  const curves = useMemo(
    () =>
      [
        // main branching trunk running up the right side
        [
          [1.6, -2.1, 0], [2.3, -1.1, 0.05], [2.6, 0.1, 0], [2.9, 1.3, 0.05], [2.7, 2.5, 0], [3.2, 3.4, 0],
        ],
        [
          [2.6, 0.1, 0], [3.3, 0.4, 0.05], [3.9, 0.1, 0],
        ],
        [
          [2.9, 1.3, 0], [3.6, 1.7, 0.05], [4.1, 1.4, 0],
        ],
        [
          [2.3, -1.1, 0], [3.0, -1.4, 0.05], [3.6, -2.0, 0],
        ],
        // lower drooping branch
        [
          [1.6, -2.1, 0], [2.0, -2.8, 0.05], [2.8, -3.2, 0], [3.5, -2.9, 0.05],
        ],
      ].map(makeCurve),
    []
  );
  return (
    <Selectable id="smooth_er" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.16]}
        scale={u.s}
        {...pickProps(editor, 'smooth_er')}
      >
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.15} color="#4fd0ca" hl={hl} id="smooth_er" />
        ))}
        {SMOOTH_ER_BLOBS.map((b, i) => (
          <Blob key={i} {...b} color="#4fd0ca" hl={hl} id="smooth_er" />
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Golgi: pink curved stacked flattened sacs ---------- */
function Golgi({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.golgi;
  const hl = useHighlight('golgi_complex', hovered, flash) || editor?.selected === 'golgi';
  const arcs = [0.55, 0.85, 1.15, 1.45, 1.75];
  const vesicles = [
    [-1.1, 0.9, 0], [1.2, 1.0, 0], [-1.5, -0.3, 0], [1.6, -0.2, 0], [0.1, 1.35, 0],
  ];
  return (
    <Selectable id="golgi_complex" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.16]}
        scale={u.s}
        {...pickProps(editor, 'golgi')}
      >
        {arcs.map((r, i) => (
          <mesh
            key={i}
            userData={{ structureId: 'golgi_complex' }}
            rotation={[0, 0, Math.PI * 0.18]}
            scale={[1, 1, 0.6]}
          >
            <torusGeometry args={[r, 0.14, 12, 48, Math.PI * 0.64]} />
            {glossy('#e75480', hl)}
          </mesh>
        ))}
        {vesicles.map((p, i) => (
          <mesh key={i} userData={{ structureId: 'golgi_complex' }} position={p}>
            <sphereGeometry args={[0.16, 14, 10]} />
            {glossy('#e75480', hl)}
          </mesh>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Mitochondria: bright orange ovals with dark zig-zag cristae ---------- */
function Mitochondrion({ position, rotation = 0, scale = 1, hl, editor, unit }) {
  const cristaeCurve = useMemo(
    () =>
      makeCurve([
        [-0.6, 0.14, 0], [-0.35, -0.14, 0.02], [-0.1, 0.14, 0], [0.15, -0.14, 0.02],
        [0.4, 0.14, 0], [0.6, -0.1, 0],
      ]),
    []
  );
  return (
    <group
      position={position}
      rotation={[0, 0, rotation]}
      scale={scale}
      {...pickProps(editor, unit)}
    >
      {/* bright orange glossy body */}
      <mesh userData={{ structureId: 'mitochondria' }} scale={[1, 0.55, 0.4]}>
        <sphereGeometry args={[0.95, 32, 24]} />
        {glossy('#f2762e', hl, { roughness: 0.15 })}
      </mesh>
      {/* dark zig-zag cristae on the body */}
      <group position={[0, 0, 0.36]}>
        <TubeMesh
          curve={cristaeCurve}
          radius={0.06}
          color="#26170e"
          hl={hl}
          id="mitochondria"
          segments={40}
        />
      </group>
    </group>
  );
}

const MITO_BASE = [
  { rotation: 0.35, scale: 0.9 },
  { rotation: 1.1, scale: 0.8 },
  { rotation: -0.4, scale: 0.8 },
  { rotation: 0.5, scale: 0.7 },
  { rotation: 0.15, scale: 0.8 },
];

function Mitochondria({ hovered, flash, onSelect, onHover, layout, editor }) {
  const hl = useHighlight('mitochondria', hovered, flash);
  return (
    <Selectable id="mitochondria" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group position={[0, 0, FACE_Z + 0.22]}>
        {MITO_BASE.map((b, i) => {
          const u = layout[`mito_${i}`];
          return (
            <Mitochondrion
              key={i}
              position={[u.x, u.y, 0]}
              rotation={b.rotation}
              scale={b.scale * u.s}
              hl={hl || editor?.selected === `mito_${i}`}
              editor={editor}
              unit={`mito_${i}`}
            />
          );
        })}
      </group>
    </Selectable>
  );
}

/* ---------- Lysosomes: small glossy yellow/red beads ---------- */
const LYSO_BASE = [
  { color: '#e33d24', scale: 1 },
  { color: '#f4c430', scale: 1 },
  { color: '#f4c430', scale: 0.85 },
  { color: '#e33d24', scale: 0.85 },
  { color: '#f4c430', scale: 0.8 },
];

function Lysosomes({ hovered, flash, onSelect, onHover, layout, editor }) {
  const hl = useHighlight('lysosome', hovered, flash);
  return (
    <Selectable id="lysosome" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group position={[0, 0, FACE_Z + 0.2]}>
        {LYSO_BASE.map((b, i) => {
          const u = layout[`lyso_${i}`];
          return (
            <mesh
              key={i}
              userData={{ structureId: 'lysosome' }}
              position={[u.x, u.y, 0]}
              scale={b.scale * u.s}
              {...pickProps(editor, `lyso_${i}`)}
            >
              <sphereGeometry args={[0.34, 24, 18]} />
              {glossy(b.color, hl || editor?.selected === `lyso_${i}`, { roughness: 0.1 })}
            </mesh>
          );
        })}
      </group>
    </Selectable>
  );
}

/* ---------- Microfilaments: bundle of thin wavy actin threads ---------- */
const MICROFILAMENT_CURVES = [
  [[-1.1, -0.12, 0], [-0.5, 0.08, 0.03], [0.1, -0.1, 0], [0.7, 0.1, 0.03], [1.1, -0.05, 0]],
  [[-1.05, 0.1, 0], [-0.45, 0.28, 0.03], [0.15, 0.1, 0], [0.72, 0.3, 0.03], [1.05, 0.16, 0]],
  [[-1.0, -0.32, 0], [-0.4, -0.15, 0.03], [0.2, -0.34, 0], [0.75, -0.14, 0.03], [1.0, -0.28, 0]],
];

function Microfilaments({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.microfilament;
  const hl =
    useHighlight('microfilament', hovered, flash) ||
    editor?.selected === 'microfilament';
  const curves = useMemo(() => MICROFILAMENT_CURVES.map(makeCurve), []);
  return (
    <Selectable id="microfilament" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.18]}
        scale={u.s}
        rotation={[0, 0, 1.25]}
        {...pickProps(editor, 'microfilament')}
      >
        {curves.map((c, i) => (
          <TubeMesh key={i} curve={c} radius={0.055} color="#b06ae0" hl={hl} id="microfilament" segments={40} />
        ))}
        {/* wider invisible hit target along the bundle */}
        <mesh userData={{ structureId: 'microfilament' }} visible={false} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.3, 0.8, 0.3]} />
        </mesh>
      </group>
    </Selectable>
  );
}

/* ---------- Microtubules: green hollow straight tubes ---------- */
function Microtubules({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.microtubule;
  const hl =
    useHighlight('microtubule', hovered, flash) || editor?.selected === 'microtubule';
  return (
    <Selectable id="microtubule" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.2]}
        scale={u.s}
        rotation={[0, 0, -0.12]}
        {...pickProps(editor, 'microtubule')}
      >
        {[0.19, -0.19].map((y, i) => (
          <group key={i} position={[i === 0 ? -0.15 : 0.15, y, 0]}>
            <mesh userData={{ structureId: 'microtubule' }} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 2.3, 16]} />
              {glossy('#3fae4a', hl, { roughness: 0.18 })}
            </mesh>
            {/* darker end rings to suggest the hollow tube */}
            {[-1.15, 1.15].map((x) => (
              <mesh
                key={x}
                userData={{ structureId: 'microtubule' }}
                position={[x, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <torusGeometry args={[0.1, 0.035, 10, 20]} />
                {glossy('#1d5c27', hl)}
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </Selectable>
  );
}

/* ---------- Free ribosomes: white dots scattered on the disc ---------- */
function FreeRibosomes({ hovered, flash, onSelect, onHover, layout, editor }) {
  const u = layout.free_ribosomes;
  const hl =
    useHighlight('free_ribosomes', hovered, flash) ||
    editor?.selected === 'free_ribosomes';
  const dots = useMemo(() => {
    const list = [];
    const seed = { v: 42 };
    const rand = () => {
      seed.v = (seed.v * 16807) % 2147483647;
      return seed.v / 2147483647;
    };
    let attempts = 0;
    while (list.length < 34 && attempts < 900) {
      attempts++;
      const a = rand() * Math.PI * 2;
      const r = 1.3 + rand() * 3.3;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const clearOf = (cx, cy, d) => (x - cx) ** 2 + (y - cy) ** 2 > d * d;
      if (
        clearOf(0, 0.1, 2.1) && // nucleus
        clearOf(-2.9, 1.0, 1.7) && // rough ER maze
        clearOf(2.9, 0.6, 1.4) && // smooth ER band
        clearOf(2.2, -1.6, 1.0) && // smooth ER lower trunk
        clearOf(2.5, -3.0, 1.0) && // smooth ER droop
        clearOf(-0.4, 2.7, 1.9) && // golgi
        clearOf(1.4, 3.5, 1.1) &&
        clearOf(-2.0, 3.4, 1.0) &&
        clearOf(-4.0, -1.2, 1.0) &&
        clearOf(-1.6, -1.85, 0.9) &&
        clearOf(1.6, -3.5, 1.0) && // mitochondria
        clearOf(1.65, 0.3, 1.3) && // microfilaments
        clearOf(-0.2, -2.8, 1.5) // microtubules
      ) {
        list.push([x, y, 0]);
      }
    }
    return list;
  }, []);
  return (
    <Selectable id="free_ribosomes" onSelect={onSelect} onHover={onHover} editor={editor}>
      <group
        position={[u.x, u.y, FACE_Z + 0.12]}
        scale={u.s}
        {...pickProps(editor, 'free_ribosomes')}
      >
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

export default function CellModel({
  onSelect,
  flashId,
  interactive = true,
  layout = DEFAULT_LAYOUT,
  editor = null,
}) {
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
  const common = {
    hovered,
    flash: flashId,
    onSelect: handleSelect,
    onHover: handleHover,
    layout,
    editor,
  };
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
      <Microfilaments {...common} />
      <Microtubules {...common} />
      <FreeRibosomes {...common} />
    </group>
  );
}
