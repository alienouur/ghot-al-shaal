// Modular data layer: swap this implementation for a backend later.
const KEY = 'cell-anatomy-3d-leaderboard';

function storageAvailable() {
  try {
    const t = '__test__';
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

const available = typeof window !== 'undefined' && storageAvailable();
let memoryFallback = [];

function readAll() {
  if (!available) return memoryFallback;
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  if (!available) {
    memoryFallback = entries;
    return;
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // storage full or blocked; ignore
  }
}

export const LeaderboardStorage = {
  isPersistent: available,

  saveResult({ name, score, total, testType, accuracy, durationSec }) {
    const entries = readAll();
    entries.push({
      name,
      score,
      total,
      testType,
      accuracy,
      durationSec,
      date: new Date().toISOString(),
    });
    writeAll(entries);
  },

  getLeaderboard(testType, limit = 10) {
    return readAll()
      .filter((e) => e.testType === testType)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.accuracy - a.accuracy ||
          (a.durationSec ?? Infinity) - (b.durationSec ?? Infinity)
      )
      .slice(0, limit);
  },
};
