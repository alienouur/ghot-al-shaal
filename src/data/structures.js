export const STRUCTURES = [
  {
    id: 'plasma_membrane',
    name: 'Plasma Membrane',
    description: 'Controls what enters and leaves the cell.',
  },
  {
    id: 'nucleus',
    name: 'Nucleus',
    description: "Contains most of the cell's genetic material and helps control cell activities.",
  },
  {
    id: 'bound_ribosomes',
    name: 'Bound Ribosomes',
    description: 'Attached to the rough ER; make proteins destined for membranes or export.',
  },
  {
    id: 'free_ribosomes',
    name: 'Free Ribosomes',
    description: 'Float in the cytoplasm and make proteins used inside the cell.',
  },
  {
    id: 'rough_er',
    name: 'Rough Endoplasmic Reticulum',
    description: 'Studded with ribosomes; helps make and fold proteins.',
  },
  {
    id: 'smooth_er',
    name: 'Smooth Endoplasmic Reticulum',
    description: 'Makes lipids and helps detoxify substances; has no ribosomes.',
  },
  {
    id: 'golgi_complex',
    name: 'Golgi Complex',
    description: 'Modifies, sorts, and packages proteins and other molecules.',
  },
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    description: 'Produce ATP, which provides energy for many cellular activities.',
  },
  {
    id: 'lysosome',
    name: 'Lysosome',
    description: 'Contains enzymes that break down cellular materials.',
  },
];

export const STRUCTURE_MAP = Object.fromEntries(STRUCTURES.map((s) => [s.id, s]));

const VERBS = ['Find', 'Locate'];

export function questionText(structure, index) {
  return `${VERBS[index % VERBS.length]} the ${structure.name.toLowerCase().replace('golgi', 'Golgi')}`;
}

// Generates a question list: no back-to-back repeats, and no structure repeats
// until every structure has been used once.
export function generateQuestions(count) {
  const questions = [];
  let pool = [];
  let last = null;
  while (questions.length < count) {
    if (pool.length === 0) {
      pool = [...STRUCTURES];
      // shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      if (last && pool[0].id === last.id && pool.length > 1) {
        [pool[0], pool[1]] = [pool[1], pool[0]];
      }
    }
    const s = pool.shift();
    questions.push(s);
    last = s;
  }
  return questions;
}
