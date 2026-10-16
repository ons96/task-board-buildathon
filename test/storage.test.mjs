import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, loadState, parseState, saveState, serializeState } from '../src/storage.mjs';

function fakeStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, value); },
  };
}

test('state serialization round-trips task data without a server', () => {
  const original = createInitialState({ demo: false });
  original.tasks.push({ id: 'task-1', title: 'Local task' });
  original.selectedTaskId = 'task-1';
  const parsed = parseState(serializeState(original));

  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.tasks[0].title, 'Local task');
  assert.equal(parsed.selectedTaskId, 'task-1');
});

test('loadState falls back to the demo when local storage is empty or invalid', () => {
  const storage = fakeStorage();
  const first = loadState(storage);
  assert.equal(first.demoMode, true);
  assert.ok(first.tasks.length > 0);

  storage.setItem('task-board:v1', '{not json');
  const fallback = loadState(storage);
  assert.equal(fallback.demoMode, true);
  assert.ok(fallback.tasks.length > 0);
});

test('saveState writes a browser-compatible JSON payload', () => {
  const storage = fakeStorage();
  const state = createInitialState({ demo: false });

  assert.equal(saveState(state, storage), true);
  assert.match(storage.getItem('task-board:v1'), /"schemaVersion":1/);
});
