import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addEvidence,
  canCompleteTask,
  createTask,
  getDoneGate,
  taskProgress,
  transitionTask,
} from '../src/task-model.mjs';

const fixedNow = '2026-10-15T10:00:00.000Z';

function sampleTask(overrides = {}) {
  return createTask({
    id: 'task-1',
    title: 'Verify a task',
    acceptanceCriteria: [
      { id: 'criterion-1', text: 'The result is visible.', verified: false },
      { id: 'criterion-2', text: 'The result is repeatable.', verified: false },
    ],
    subtasks: [
      { id: 'subtask-1', text: 'Do the work', completed: false },
    ],
    ...overrides,
  }, { now: fixedNow, idFactory: (prefix) => `${prefix}-generated` });
}

test('createTask applies safe defaults and keeps the smallest useful shape', () => {
  const task = createTask({}, { now: fixedNow, idFactory: (prefix) => `${prefix}-1` });

  assert.equal(task.title, 'Untitled task');
  assert.equal(task.status, 'inbox');
  assert.equal(task.type, 'chore');
  assert.equal(task.acceptanceCriteria.length, 1);
  assert.equal(task.acceptanceCriteria[0].verified, false);
  assert.equal(task.createdAt, fixedNow);
});

test('Done is blocked until every criterion is verified and evidence exists', () => {
  const task = sampleTask();
  assert.equal(canCompleteTask(task), false);
  assert.deepEqual(getDoneGate(task).reasons, [
    '2 acceptance criteria still need verification.',
    'Attach at least one evidence item.',
  ]);

  task.acceptanceCriteria[0].verified = true;
  assert.equal(getDoneGate(task).unverifiedCount, 1);
  task.acceptanceCriteria[1].verified = true;
  assert.equal(getDoneGate(task).allowed, false);

  const evidenceResult = addEvidence(task, {
    kind: 'test-output',
    label: 'Unit tests',
    content: 'npm test - pass',
  }, { now: fixedNow, idFactory: (prefix) => `${prefix}-1` });
  assert.equal(evidenceResult.ok, true);
  assert.equal(canCompleteTask(evidenceResult.task), true);
});

test('Done is blocked when a criterion has no text', () => {
  const task = sampleTask({
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Valid before editing', verified: true }],
    evidence: [{ id: 'evidence-1', kind: 'note', label: 'Review', content: 'Confirmed', createdAt: fixedNow }],
  });
  task.acceptanceCriteria[0].text = '   ';

  assert.equal(canCompleteTask(task), false);
  assert.deepEqual(getDoneGate(task).reasons, ['1 acceptance criterion needs text.']);
});

test('createTask downgrades an invalid Done task to Review', () => {
  const task = createTask({
    status: 'done',
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Not verified', verified: false }],
  }, { now: fixedNow });

  assert.equal(task.status, 'review');
});

test('transitionTask rejects a blocked Done move without mutating the task', () => {
  const task = sampleTask({ status: 'review' });
  const result = transitionTask(task, 'done', fixedNow);

  assert.equal(result.ok, false);
  assert.equal(result.task.status, 'review');
  assert.match(result.reasons[0], /criteria/);
});

test('transitionTask records an accepted status change', () => {
  const task = sampleTask({
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Verified', verified: true }],
    evidence: [{ id: 'evidence-1', kind: 'note', label: 'Review', content: 'Confirmed', createdAt: fixedNow }],
  });
  const result = transitionTask(task, 'done', fixedNow);

  assert.equal(result.ok, true);
  assert.equal(result.task.status, 'done');
  assert.equal(result.task.updatedAt, fixedNow);
});

test('taskProgress reports criteria, subtasks, and evidence separately', () => {
  const task = sampleTask({
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Verified', verified: true }],
    subtasks: [
      { id: 'subtask-1', text: 'Complete', completed: true },
      { id: 'subtask-2', text: 'Open', completed: false },
    ],
    evidence: [{ id: 'evidence-1', kind: 'note', label: 'Note', content: 'Done', createdAt: fixedNow }],
  });

  assert.deepEqual(taskProgress(task), {
    criteria: { complete: 1, total: 1 },
    subtasks: { complete: 1, total: 2 },
    evidence: 1,
  });
});
