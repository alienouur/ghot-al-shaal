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
  mito_3: { x: -1.4, y: -2.2, s: 1 },
  mito_4: { x: 1.0, y: -3.3, s: 1 },
  lyso_0: { x: -3.4, y: 2.9, s: 1 },
  lyso_1: { x: 0.9, y: -4.2, s: 1 },
  lyso_2: { x: -2.8, y: -3.2, s: 1 },
  lyso_3: { x: -0.3, y: -3.4, s: 1 },
  lyso_4: { x: 1.9, y: 1.6, s: 1 },
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
};

const KEY = 'cell_anatomy_layout_v1';

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
