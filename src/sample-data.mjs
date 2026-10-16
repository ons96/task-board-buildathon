import { createTask } from './task-model.mjs';

const sampleDate = '2026-10-15T09:00:00.000Z';

export function createSampleTasks() {
  return [
    createTask(
      {
        id: 'sample-inbox',
        title: 'Clarify the release checklist request',
        summary: 'A messy request is waiting to be turned into a small, verifiable task.',
        type: 'research',
        status: 'inbox',
        sourceText: 'We need a better release checklist. It is hard to know what was actually checked before publishing.',
        acceptanceCriteria: [
          { id: 'sample-inbox-criterion-1', text: 'Capture the current release checks in one visible list.', verified: false },
          { id: 'sample-inbox-criterion-2', text: 'Identify which checks need evidence.', verified: false },
        ],
        subtasks: [
          { id: 'sample-inbox-subtask-1', text: 'Collect the current checklist examples', completed: false },
          { id: 'sample-inbox-subtask-2', text: 'Turn gaps into follow-up tasks', completed: false },
        ],
        verificationCommands: ['Review the checklist with one release example'],
        risks: ['The existing process may differ between maintainers.'],
        openQuestions: ['Which checks are mandatory for every release?'],
        recommendedNextAction: 'Add the missing context, then move this task to Ready.',
        createdAt: sampleDate,
        updatedAt: sampleDate,
      },
      { now: sampleDate },
    ),
    createTask(
      {
        id: 'sample-ready',
        title: 'Document the offline demo path',
        summary: 'Make it easy for a new contributor to run the demo without credentials or network access.',
        type: 'docs',
        status: 'ready',
        sourceText: 'Please document how to run the local demo without an API key.',
        acceptanceCriteria: [
          { id: 'sample-ready-criterion-1', text: 'The README includes the local run command.', verified: false },
          { id: 'sample-ready-criterion-2', text: 'The README explains that no API key is needed.', verified: false },
        ],
        subtasks: [
          { id: 'sample-ready-subtask-1', text: 'Write the setup section', completed: true },
          { id: 'sample-ready-subtask-2', text: 'Test the instructions from a clean checkout', completed: false },
        ],
        verificationCommands: ['npm test', 'npm start'],
        risks: ['Instructions can drift as scripts change.'],
        openQuestions: [],
        recommendedNextAction: 'Start the documentation pass and attach the clean-checkout result.',
        createdAt: sampleDate,
        updatedAt: sampleDate,
      },
      { now: sampleDate },
    ),
    createTask(
      {
        id: 'sample-progress',
        title: 'Add a clear review state to the board',
        summary: 'Give maintainers a deliberate place to review criteria and evidence before completion.',
        type: 'feature',
        status: 'in_progress',
        sourceText: 'Add a review column between work in progress and done.',
        acceptanceCriteria: [
          { id: 'sample-progress-criterion-1', text: 'The board shows a Review column.', verified: true },
          { id: 'sample-progress-criterion-2', text: 'A task can move into Review without evidence.', verified: false },
          { id: 'sample-progress-criterion-3', text: 'The Done gate remains visible during review.', verified: false },
        ],
        subtasks: [
          { id: 'sample-progress-subtask-1', text: 'Add the board column', completed: true },
          { id: 'sample-progress-subtask-2', text: 'Connect review guidance to the task detail view', completed: false },
        ],
        verificationCommands: ['npm test', 'Move a sample task through Review'],
        risks: ['A hidden gate would make the workflow feel unpredictable.'],
        openQuestions: ['Should completed tasks be reopenable?'],
        recommendedNextAction: 'Finish the review guidance, then verify the gate with a sample task.',
        createdAt: sampleDate,
        updatedAt: sampleDate,
      },
      { now: sampleDate },
    ),
    createTask(
      {
        id: 'sample-review',
        title: 'Verify the task card presentation',
        summary: 'Check that generated task cards are readable and useful before calling the flow complete.',
        type: 'chore',
        status: 'review',
        sourceText: 'Review the generated card layout and make sure it is useful.',
        acceptanceCriteria: [
          { id: 'sample-review-criterion-1', text: 'The card shows the title and concise summary.', verified: true },
          { id: 'sample-review-criterion-2', text: 'The card exposes criteria, subtasks, and risks.', verified: true },
        ],
        subtasks: [
          { id: 'sample-review-subtask-1', text: 'Read the card at laptop width', completed: true },
          { id: 'sample-review-subtask-2', text: 'Try the keyboard path', completed: true },
        ],
        verificationCommands: ['Open the task detail view', 'Review the card at a narrow width'],
        risks: [],
        openQuestions: [],
        recommendedNextAction: 'Attach review notes. The Done gate should block this task until evidence exists.',
        createdAt: sampleDate,
        updatedAt: sampleDate,
      },
      { now: sampleDate },
    ),
    createTask(
      {
        id: 'sample-done',
        title: 'Confirm the offline sample workflow',
        summary: 'A completed example showing what verified criteria and attached evidence look like.',
        type: 'feature',
        status: 'done',
        sourceText: 'Confirm the sample workflow works with no network access.',
        acceptanceCriteria: [
          { id: 'sample-done-criterion-1', text: 'The sample board loads without a network request.', verified: true },
          { id: 'sample-done-criterion-2', text: 'The Done gate accepts verified criteria with evidence.', verified: true },
        ],
        subtasks: [
          { id: 'sample-done-subtask-1', text: 'Load the bundled demo data', completed: true },
          { id: 'sample-done-subtask-2', text: 'Attach a verification note', completed: true },
        ],
        verificationCommands: ['npm test', 'Run the app with network disabled'],
        risks: [],
        openQuestions: [],
        recommendedNextAction: 'Reopen this task if the demo behavior changes.',
        evidence: [
          {
            id: 'sample-done-evidence-1',
            kind: 'checklist',
            label: 'Offline demo checklist',
            content: 'Loaded sample data, created a task, verified criteria, attached evidence, and refreshed the page.',
            createdAt: sampleDate,
          },
        ],
        createdAt: sampleDate,
        updatedAt: sampleDate,
      },
      { now: sampleDate },
    ),
  ];
}
