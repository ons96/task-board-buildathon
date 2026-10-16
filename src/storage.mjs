import { createSampleTasks } from './sample-data.mjs';
import { createTask } from './task-model.mjs';

export const STORAGE_KEY = 'task-board:v1';

export function createInitialState({ demo = true } = {}) {
  return {
    schemaVersion: 1,
    tasks: demo ? createSampleTasks() : [],
    selectedTaskId: null,
    demoMode: demo,
  };
}

export function serializeState(state) {
  return JSON.stringify({
    schemaVersion: 1,
    tasks: Array.isArray(state?.tasks) ? state.tasks : [],
    selectedTaskId: state?.selectedTaskId || null,
    demoMode: state?.demoMode === true,
  });
}

export function parseState(serialized, fallback = createInitialState()) {
  if (typeof serialized !== 'string' || serialized.trim() === '') return fallback;

  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || !Array.isArray(parsed.tasks)) return fallback;
    return {
      schemaVersion: 1,
      tasks: parsed.tasks
        .filter((task) => task && typeof task === 'object')
        .map((task) => createTask(task)),
      selectedTaskId: typeof parsed.selectedTaskId === 'string' ? parsed.selectedTaskId : null,
      demoMode: parsed.demoMode === true,
    };
  } catch {
    return fallback;
  }
}

export function loadState(storage = globalThis.localStorage) {
  if (!storage || typeof storage.getItem !== 'function') return createInitialState();
  return parseState(storage.getItem(STORAGE_KEY));
}

export function saveState(state, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== 'function') return false;
  storage.setItem(STORAGE_KEY, serializeState(state));
  return true;
}
