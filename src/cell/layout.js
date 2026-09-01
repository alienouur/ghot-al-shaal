// Editable model layout: each movable unit has an x/y position on the disc
// face and a scale multiplier. Persisted in localStorage via the editor.

export const DEFAULT_LAYOUT = {
  nucleus: { x: 0, y: 0.1, s: 1 },
  golgi: { x: -0.4, y: 2.7, s: 1 },
  rough_er: { x: 0, y: 0, s: 1 },
  smooth_er: { x: 0, y: 0, s: 1 },
  free_ribosomes: { x: 0, y: 0, s: 1 },
  mito_0: { x: 1.4, y: 3.5, s: 1 },
  mito_1: { x: -2.0, y: 3.4, s: 1 },
  mito_2: { x: -4.0, y: -1.2, s: 1 },
  mito_3: { x: -1.6, y: -1.85, s: 1 },
  mito_4: { x: 1.6, y: -3.5, s: 1 },
  lyso_0: { x: -3.4, y: 2.9, s: 1 },
  lyso_1: { x: 0.6, y: -4.3, s: 1 },
  lyso_2: { x: -2.8, y: -3.2, s: 1 },
  lyso_3: { x: -1.9, y: -4.05, s: 1 },
  lyso_4: { x: 0.95, y: 1.95, s: 1 },
  microfilament: { x: 1.65, y: 0.3, s: 1 },
  microtubule: { x: -0.2, y: -2.8, s: 1 },
};

export const UNIT_LABELS = {
  nucleus: 'Nucleus',
  golgi: 'Golgi Complex',
  rough_er: 'Rough ER (+ bound ribosomes)',
  smooth_er: 'Smooth ER',
  free_ribosomes: 'Free Ribosomes',
  mito_0: 'Mitochondrion 1',
  mito_1: 'Mitochondrion 2',
  mito_2: 'Mitochondrion 3',
  mito_3: 'Mitochondrion 4',
  mito_4: 'Mitochondrion 5',
  lyso_0: 'Lysosome 1',
  lyso_1: 'Lysosome 2',
  lyso_2: 'Lysosome 3',
  lyso_3: 'Lysosome 4',
  lyso_4: 'Lysosome 5',
  microfilament: 'Microfilaments',
  microtubule: 'Microtubules',
};

const KEY = 'cell_anatomy_layout_v1';

export const LAYOUT_API = 'https://textdb.online';
const REMOTE_KEY = 'cellanatomy_ghot_layout_v1_x7k2q9';
const PASS_HASH =
  'ce8457d59078a699acb70416f88155a96a906b7b7aad43708402e3a3bcc8a4b4';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sanitize(saved) {
  const merged = {};
  for (const k of Object.keys(DEFAULT_LAYOUT)) {
    const v = saved && saved[k];
    merged[k] =
      v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.s)
        ? { x: v.x, y: v.y, s: v.s }
        : { ...DEFAULT_LAYOUT[k] };
  }
  return merged;
}

export async function fetchRemoteLayout() {
  try {
    const res = await fetch(`${LAYOUT_API}/${REMOTE_KEY}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') return null;
    return sanitize(data);
  } catch {
    return null;
  }
}

export async function verifyPassword(password) {
  try {
    return (await sha256Hex(password)) === PASS_HASH;
  } catch {
    return false;
  }
}

export async function saveRemoteLayout(layout, password) {
  try {
    if (!(await verifyPassword(password))) return false;
    const body = new URLSearchParams({
      key: REMOTE_KEY,
      value: JSON.stringify(layout),
    });
    const res = await fetch(`${LAYOUT_API}/update`, {
      method: 'POST',
      body,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data && data.status === 1;
  } catch {
    return false;
  }
}

export function loadLayout() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const saved = JSON.parse(raw);
    const merged = {};
    for (const k of Object.keys(DEFAULT_LAYOUT)) {
      const v = saved[k];
      merged[k] =
        v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.s)
          ? { x: v.x, y: v.y, s: v.s }
          : { ...DEFAULT_LAYOUT[k] };
    }
    return merged;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function saveLayout(layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
}

export function resetLayout() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_LAYOUT };
}
