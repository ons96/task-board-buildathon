# Task Board

Task Board turns a messy issue or task into an actionable, editable card and keeps the Done column evidence-based.

It is a local-first MVP for open-source maintainers and solo developers. The app runs with Node.js, stores work in the browser, and uses a deterministic offline planner. No account, API key, database, or network connection is required.

## What it does

- Turns pasted issue text into a structured task card.
- Generates a title, summary, type, acceptance criteria, subtasks, verification commands, risks, open questions, and next action.
- Lets you edit every generated field.
- Organizes work in Inbox, Ready, In Progress, Review, and Done.
- Attaches test output, notes, or verification checklists as local evidence.
- Blocks Done until every acceptance criterion is verified and at least one evidence item is attached.
- Starts with sample data for an immediate offline demo.
- Saves tasks in browser local storage.

## Requirements

- Node.js 22.19.0 or newer.
- No global package installation is required.
- Docker is optional for the normal development workflow.

The project pins the intended runtime in `.nvmrc`. The app has no runtime dependencies, so it is suitable for low-spec machines.

## Run locally

```bash
npm ci
npm start
```

Open <http://127.0.0.1:4173>.

Optional server settings can be supplied through the shell:

```bash
HOST=127.0.0.1 PORT=4173 npm start
```

## Offline demo

The first visit loads five sample tasks across the workflow. Try this path:

1. Open the task in Review named `Verify the task card presentation`.
2. Notice that the Done gate blocks completion because no evidence is attached.
3. Add a note or checklist in the Evidence section.
4. Move the task to Done from the status menu.
5. Paste a new messy issue into the planner and generate another card.
6. Refresh the browser to confirm local persistence.

Use `Load demo` to restore the sample board or `Clear board` to start from an empty local board.

## Test

The single test command uses Node's built-in test runner and does not call the network:

```bash
npm test
```

The tests cover planning, task defaults, status transitions, the Done gate, evidence, local-storage serialization, and required static entry points.

## Optional Docker validation

Docker is not needed to run Task Board. It is included for clean Linux rebuilds and buildathon judging:

```bash
docker build -t task-board .
docker run --rm --network none task-board npm test
docker run --rm --network none -p 4173:4173 task-board
```

Then open <http://127.0.0.1:4173>.

The application itself makes no runtime network requests. The Docker image only packages the same small Node server and static files.

## Project layout

```text
public/       Browser UI, styles, and event handling
src/          Task model, planner, sample data, and storage helpers
test/         Offline Node tests
server.mjs    Dependency-free static file server
Dockerfile    Optional reproducible Linux image
```

## Privacy and scope

Task text and evidence stay in the current browser profile. There is no hosted account or synchronization. The planner is intentionally deterministic and transparent; an external AI integration is not required for the offline MVP.
