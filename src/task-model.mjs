export const STATUSES = Object.freeze([
  'inbox',
  'ready',
  'in_progress',
  'review',
  'done',
]);

export const STATUS_LABELS = Object.freeze({
  inbox: 'Inbox',
  ready: 'Ready',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
});

export const TASK_TYPES = Object.freeze([
  'bug',
  'feature',
  'chore',
  'docs',
  'research',
]);

export const TASK_TYPE_LABELS = Object.freeze({
  bug: 'Bug',
  feature: 'Feature',
  chore: 'Chore',
  docs: 'Docs',
  research: 'Research',
});

export const EVIDENCE_KINDS = Object.freeze([
  'test-output',
  'note',
  'checklist',
]);

export const EVIDENCE_KIND_LABELS = Object.freeze({
  'test-output': 'Test output',
  note: 'Note',
  checklist: 'Verification checklist',
});

export function createId(prefix = 'item') {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCriteria(value, idFactory) {
  const criteria = list(value)
    .map((criterion) => {
      if (typeof criterion === 'string') {
        return { id: idFactory('criterion'), text: criterion, verified: false };
      }

      return {
        id: text(criterion?.id, idFactory('criterion')),
        text: text(criterion?.text),
        verified: criterion?.verified === true,
      };
    })
    .filter((criterion) => criterion.text.length > 0);

  return criteria.length > 0
    ? criteria
    : [{ id: idFactory('criterion'), text: 'Describe what success looks like.', verified: false }];
}

function normalizeSubtasks(value, idFactory) {
  return list(value)
    .map((subtask) => {
      if (typeof subtask === 'string') {
        return { id: idFactory('subtask'), text: subtask, completed: false };
      }

      return {
        id: text(subtask?.id, idFactory('subtask')),
        text: text(subtask?.text),
        completed: subtask?.completed === true,
      };
    })
    .filter((subtask) => subtask.text.length > 0);
}

function normalizeEvidence(value, idFactory, fallbackDate) {
  return list(value)
    .map((item) => ({
      id: text(item?.id, idFactory('evidence')),
      kind: EVIDENCE_KINDS.includes(item?.kind) ? item.kind : 'note',
      label: text(item?.label, 'Evidence'),
      content: text(item?.content),
      createdAt: text(item?.createdAt, fallbackDate),
    }))
    .filter((item) => item.content.length > 0);
}

export function createTask(input = {}, options = {}) {
  const idFactory = options.idFactory || createId;
  const now = options.now || new Date().toISOString();
  const sourceText = text(input.sourceText || input.source);
  const status = STATUSES.includes(input.status) ? input.status : 'inbox';
  const type = TASK_TYPES.includes(input.type) ? input.type : 'chore';

  return {
    id: text(input.id, idFactory('task')),
    title: text(input.title, 'Untitled task'),
    summary: text(input.summary, 'Add a concise summary for this task.'),
    type,
    status,
    sourceText,
    acceptanceCriteria: normalizeCriteria(input.acceptanceCriteria, idFactory),
    subtasks: normalizeSubtasks(input.subtasks, idFactory),
    verificationCommands: list(input.verificationCommands)
      .map((command) => text(command))
      .filter(Boolean),
    risks: list(input.risks).map((risk) => text(risk)).filter(Boolean),
    openQuestions: list(input.openQuestions).map((question) => text(question)).filter(Boolean),
    recommendedNextAction: text(
      input.recommendedNextAction,
      'Review the generated task and decide whether it is ready.',
    ),
    evidence: normalizeEvidence(input.evidence, idFactory, now),
    createdAt: text(input.createdAt, now),
    updatedAt: text(input.updatedAt, now),
  };
}

export function getDoneGate(task) {
  const criteria = Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria : [];
  const unverifiedCount = criteria.filter((criterion) => criterion.verified !== true).length;
  const evidenceCount = Array.isArray(task?.evidence) ? task.evidence.length : 0;
  const reasons = [];

  if (criteria.length === 0) {
    reasons.push('Add at least one acceptance criterion.');
  } else if (unverifiedCount > 0) {
    const label = unverifiedCount === 1 ? 'acceptance criterion' : 'acceptance criteria';
    reasons.push(`${unverifiedCount} ${label} still need verification.`);
  }

  if (evidenceCount === 0) {
    reasons.push('Attach at least one evidence item.');
  }

  return {
    allowed: reasons.length === 0,
    criteriaCount: criteria.length,
    unverifiedCount,
    evidenceCount,
    reasons,
  };
}

export function canCompleteTask(task) {
  return getDoneGate(task).allowed;
}

export function transitionTask(task, nextStatus, now = new Date().toISOString()) {
  if (!STATUSES.includes(nextStatus)) {
    return { ok: false, task, reasons: ['Choose a valid workflow status.'] };
  }

  if (nextStatus === 'done') {
    const gate = getDoneGate(task);
    if (!gate.allowed) {
      return { ok: false, task, reasons: gate.reasons };
    }
  }

  return {
    ok: true,
    task: { ...task, status: nextStatus, updatedAt: now },
    reasons: [],
  };
}

export function addEvidence(task, evidence, options = {}) {
  const idFactory = options.idFactory || createId;
  const now = options.now || new Date().toISOString();
  const item = {
    id: text(evidence?.id, idFactory('evidence')),
    kind: EVIDENCE_KINDS.includes(evidence?.kind) ? evidence.kind : 'note',
    label: text(evidence?.label, 'Evidence'),
    content: text(evidence?.content),
    createdAt: text(evidence?.createdAt, now),
  };

  if (!item.content) {
    return { ok: false, task, error: 'Evidence needs some content.' };
  }

  return {
    ok: true,
    task: { ...task, evidence: [...(task.evidence || []), item], updatedAt: now },
    evidence: item,
  };
}

export function taskProgress(task) {
  const criteria = Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria : [];
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const verifiedCriteria = criteria.filter((criterion) => criterion.verified === true).length;
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed === true).length;

  return {
    criteria: { complete: verifiedCriteria, total: criteria.length },
    subtasks: { complete: completedSubtasks, total: subtasks.length },
    evidence: Array.isArray(task?.evidence) ? task.evidence.length : 0,
  };
}
