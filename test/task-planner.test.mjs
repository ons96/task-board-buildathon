import test from 'node:test';
import assert from 'node:assert/strict';
import { planTask } from '../src/task-planner.mjs';

test('planTask turns a bug report into an editable structured card', () => {
  const task = planTask(`Bug: Login form crashes on an empty email

- Show a clear validation message
- Keep the form usable after the error` , {
    now: '2026-10-15T10:00:00.000Z',
    idFactory: (prefix) => `${prefix}-1`,
  });

  assert.equal(task.title, 'Login form crashes on an empty email');
  assert.equal(task.type, 'bug');
  assert.equal(task.acceptanceCriteria.length, 2);
  assert.equal(task.acceptanceCriteria[0].text, 'Show a clear validation message');
  assert.equal(task.subtasks.length, 3);
  assert.ok(task.recommendedNextAction.length > 0);
});

test('planTask uses deterministic templates for unclassified maintenance work', () => {
  const task = planTask('Clean up the release checklist wording.', {
    now: '2026-10-15T10:00:00.000Z',
    idFactory: (prefix) => `${prefix}-1`,
  });

  assert.equal(task.type, 'chore');
  assert.equal(task.title, 'Clean up the release checklist wording.');
  assert.deepEqual(task.verificationCommands, ['npm test', 'Review the changed behavior in the running app']);
});

test('planTask truncates long titles while retaining the original source', () => {
  const source = `Feature: ${'A'.repeat(100)}\nPlease keep the source available for later review.`;
  const task = planTask(source, { idFactory: (prefix) => `${prefix}-1` });

  assert.equal(task.title.length, 72);
  assert.ok(task.title.endsWith('...'));
  assert.equal(task.sourceText, source);
});
