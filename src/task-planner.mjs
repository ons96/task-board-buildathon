import { createTask } from './task-model.mjs';

const typeRules = [
  { type: 'bug', words: ['bug', 'broken', 'error', 'crash', 'regression', 'fails', 'failure'] },
  { type: 'feature', words: ['feature', 'add', 'build', 'support', 'create', 'introduce'] },
  { type: 'docs', words: ['docs', 'documentation', 'readme', 'guide', 'document'] },
  { type: 'research', words: ['research', 'investigate', 'explore', 'spike', 'compare'] },
];

const planTemplates = {
  bug: {
    criteria: [
      'Reproduce or otherwise confirm the reported behavior.',
      'Implement a focused fix without regressing the related workflow.',
      'Verify the changed behavior with a repeatable check.',
    ],
    subtasks: ['Reproduce the current behavior', 'Implement the smallest safe fix', 'Run a regression check'],
    risks: ['The reported behavior may depend on an environment that is not represented locally.'],
    questions: ['What is the smallest example that still demonstrates the problem?'],
  },
  feature: {
    criteria: [
      'The requested workflow is available from the intended user entry point.',
      'The main success path produces the expected result.',
      'Invalid or empty input receives a clear response.',
    ],
    subtasks: ['Confirm the user-facing flow', 'Implement the smallest useful version', 'Verify success and failure paths'],
    risks: ['A larger version of the feature could expand the scope beyond the original request.'],
    questions: ['What should happen when the user leaves a required field empty?'],
  },
  docs: {
    criteria: [
      'The intended reader can find the documented workflow quickly.',
      'The instructions include a concrete example or command.',
      'The documentation matches the current behavior.',
    ],
    subtasks: ['Identify the reader and desired outcome', 'Write the shortest complete explanation', 'Check the example from a clean state'],
    risks: ['Documentation can become stale if the related workflow changes.'],
    questions: ['Which reader should be able to complete the workflow without extra context?'],
  },
  research: {
    criteria: [
      'The investigation has a clear question and bounded scope.',
      'Findings are recorded with enough context to review later.',
      'The result recommends a concrete next action or explains why no action is needed.',
    ],
    subtasks: ['Write down the question being investigated', 'Gather the smallest useful evidence', 'Summarize findings and recommendation'],
    risks: ['An open-ended investigation can consume time without producing a decision.'],
    questions: ['What decision will this investigation enable?'],
  },
  chore: {
    criteria: [
      'The requested maintenance change is completed in the intended area.',
      'Existing behavior remains intact after the change.',
      'A repeatable verification check has been run.',
    ],
    subtasks: ['Confirm the affected area', 'Make the focused maintenance change', 'Run the relevant checks'],
    risks: ['Small maintenance changes can reveal adjacent cleanup that should remain out of scope.'],
    questions: ['Is there an existing convention or check this task should follow?'],
  },
};

function cleanLines(source) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function removeIssuePrefix(line) {
  return line
    .replace(/^(issue|task|todo|bug|feature|chore|request)\s*[:#-]\s*/i, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
}

function titleFromSource(lines) {
  const candidate = removeIssuePrefix(lines[0] || 'Untitled task');
  if (candidate.length <= 72) return candidate;
  return `${candidate.slice(0, 69).trimEnd()}...`;
}

function summaryFromSource(source, title) {
  const withoutTitle = source.replace(linesToRegExp(title), '').trim();
  const paragraph = withoutTitle.split(/\n\s*\n/)[0].trim();
  const candidate = paragraph || source.trim();
  if (!candidate) return 'Add a concise summary for this task.';
  if (candidate.length <= 180) return candidate;
  return `${candidate.slice(0, 177).trimEnd()}...`;
}

function linesToRegExp(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}`);
}

function classify(source) {
  const lower = source.toLowerCase();
  for (const rule of typeRules) {
    if (rule.words.some((word) => lower.includes(word))) return rule.type;
  }
  return 'chore';
}

function criteriaFromSource(lines, type) {
  const explicit = lines
    .slice(1)
    .map((line) => line.match(/^(?:[-*]|\d+[.)])\s+(.+)/)?.[1])
    .filter(Boolean)
    .slice(0, 3);

  if (explicit.length > 0) return explicit;
  return planTemplates[type].criteria;
}

export function planTask(source, options = {}) {
  const normalizedSource = typeof source === 'string' ? source.trim() : '';
  const lines = cleanLines(normalizedSource);
  const title = titleFromSource(lines);
  const type = classify(normalizedSource);
  const template = planTemplates[type];
  const criteria = criteriaFromSource(lines, type);

  return createTask(
    {
      title,
      summary: summaryFromSource(normalizedSource, title),
      type,
      sourceText: normalizedSource,
      acceptanceCriteria: criteria.map((text) => ({ text, verified: false })),
      subtasks: template.subtasks.map((text) => ({ text, completed: false })),
      verificationCommands: ['npm test', 'Review the changed behavior in the running app'],
      risks: template.risks,
      openQuestions: template.questions,
      recommendedNextAction: 'Review the generated criteria, edit anything unclear, then move the task to Ready.',
    },
    options,
  );
}
