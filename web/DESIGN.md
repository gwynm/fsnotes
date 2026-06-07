# FSNotes Web — Design Document

A minimal web UI for browsing and editing a shared team knowledge base of
markdown files. Server-backed (Node.js API + filesystem storage), deployed via
Docker on AWS ECS. No auth (VPN-only). Priority is simplicity and ease of use
for non-power-users; power users use FSNotes directly on the same repo.

---

## Table of Contents

1. [Scope](#scope)
2. [Feature List](#feature-list)
3. [Architecture](#architecture)
4. [Storage & Data Model](#storage--data-model)
5. [API](#api)
6. [Key Design Decisions](#key-design-decisions)
7. [Screen Layouts](#screen-layouts)
8. [Technology Choices](#technology-choices)
9. [Deployment](#deployment)
10. [Deferred Features](#deferred-features)

---

## Scope

**In scope (v1):** Browse, search, create, and edit markdown notes in a
three-pane layout. Serve images and files already in the repo. Git auto-commit
and auto-pull. Wiki-style `[[note links]]`.

**Out of scope (v1):** Authentication, encryption, tags, pinning, todo views,
nested folders, note history UI, keyboard shortcuts, drag-and-drop reordering,
find-and-replace (browser handles find), client-side settings.

---

## Feature List

### Notes

- Create, rename, delete notes
- Markdown-only (`.md` files)
- First line is the title (matching FSNotes behavior)
- Notes belong to exactly one folder
- Move notes between folders

### Editor

- Full markdown editing with syntax highlighting in the source
- Toggle between edit and preview mode
- Toolbar for common formatting: bold, italic, strikethrough, headers (H1-H6),
  bullet list, numbered list, checkbox list, code block, blockquote, link
- Configurable font, font size, and line height (via env vars, not per-user)
- Code blocks with syntax highlighting (30+ languages)
- Image paste/drag-and-drop (uploaded to `i/` folder, inserted as `![](../i/filename.png)`)
- Wiki-style `[[note links]]` — rendered as clickable links in the preview,
  navigate to the referenced note within the app
- Edit/preview toggle — switch between editor and rendered preview (not
  side-by-side; one or the other at a time)

### Images & Files

- Paste or drag-and-drop images into the editor — uploaded to `i/`, markdown
  image tag `![](../i/filename.png)` inserted at cursor
- File upload button — uploaded to `files/`, markdown link
  `[filename.pdf](../files/filename.pdf)` inserted at cursor
- Images render inline in preview mode
- File links are clickable in preview (served by the API)

### Sidebar (left pane)

- **All Notes**: shows every note across all folders
- **Folders**: flat list (not nested), sorted alphabetically
  - Clicking a folder shows its notes in the note list
- **Trash**: shows soft-deleted notes in `.Trash/`

### Note List (center pane)

- Shows notes for the selected folder or search results
- Each row: title, 1-2 line preview, modified date
- Sort by: modification date (default), creation date, title
  (ascending/descending)

### Search

- Global full-text search across all notes (title + body)
- Results shown in the note list pane, replacing the current listing
- Highlight matches in the note list preview

### Git Integration

- The notes root is a Git repository on the server
- **Auto-commit**: server commits changes on a configurable interval
  (e.g. every 5 minutes), batching any writes since the last commit
- **Auto-pull**: server pulls from the configured remote on a configurable
  interval (e.g. every 60 seconds) to pick up changes pushed from other
  sources (FSNotes desktop, other clones)
- **Git status indicator** in the UI footer (clean / uncommitted changes /
  ahead/behind remote)
- Note history is accessible via the git repo directly (SSH into the box,
  or use GitHub/Gitea UI) — no in-app history viewer

### Configuration

All settings are server-side environment variables. There is no settings UI.
This keeps the app simple and ensures consistency for all users on the VPN.

---

## Architecture

```
┌─────────────┐         ┌──────────────────────────┐       ┌──────────────┐
│   Browser   │  HTTP   │     Docker Container     │       │  EFS Volume  │
│  (React SPA)│ ◄─────► │  ┌────────┐  ┌────────┐ │       │  /data/notes │
│             │         │  │ Static  │  │ Node   │ │  r/w  │  (git repo   │
│             │         │  │ files   │  │ API    │ ├──────►│   of .md     │
│             │         │  │ (Vite)  │  │ server │ │       │   files)     │
│             │         │  └────────┘  └──┬─────┘ │       └──────────────┘
└─────────────┘         └─────────────────┼───────┘
                                          │ git push/pull
                                          ▼
                                   ┌──────────────┐
                                   │  Git Remote  │
                                   │  (GitHub,    │
                                   │   Gitea, etc)│
                                   └──────────────┘
```

Single container runs both the API server and serves the static frontend.
The API server reads/writes `.md` files directly on the mounted volume. No
database — the filesystem _is_ the database.

Notes are plain `.md` files in a Git repository on an EFS volume. They survive
container restarts and can be accessed from other tools (FSNotes, SSH, VS Code,
etc.). The server auto-commits and auto-pulls on configurable intervals.

---

## Storage & Data Model

### Filesystem Layout (server-side)

The notes root directory mirrors the existing repo structure:

```
/data/notes/                       # NOTES_ROOT env var
├── development/                   # folder
│   ├── AWS architecture.md
│   ├── How Dossier Generation Works.md
│   └── ...
├── operations/
│   └── Operations Notes.md
├── i/                             # images (referenced as ../i/ from notes)
│   ├── Screenshot 2024-03-04 at 12.49.42.png
│   ├── TicketFlow.png
│   └── ...
├── files/                         # file attachments
│   └── ticket_audit_push_event_description.pdf
├── .Trash/                        # soft-deleted notes
└── .git/
```

Folders are flat (no nesting). The `i/` and `files/` directories are reserved
for images and attachments — not shown as note folders in the sidebar.

### Data Model

**Note** (server returns as JSON; `content` omitted in list responses)

```
Note {
  path:          string       // relative, e.g. "development/AWS architecture.md"
  folder:        string       // parent dir, e.g. "development"
  content:       string       // raw markdown (only in single-note responses)
  title:         string       // derived: first non-empty line of content
  preview:       string       // derived: ~150 chars after title, markdown stripped
  createdAt:     ISO 8601     // file birthtime
  modifiedAt:    ISO 8601     // file mtime
}
```

**Folder**

```
Folder {
  name:          string       // e.g. "development"
  noteCount:     number       // number of .md files in this folder
}
```

### Reserved Directories

These directories exist in the repo but are not shown as folders in the
sidebar:

- `i/` — images referenced from notes as `![](../i/filename.png)`
- `files/` — file attachments referenced from notes
- `.Trash/` — soft-deleted notes (shown as a special "Trash" item)
- `.git/` — git repository data

### Derived Fields (computed server-side)

- `title` — first non-empty line of `content`, with leading `# ` stripped
- `preview` — next ~150 chars after title, with markdown syntax stripped

---

## API

All endpoints are under `/api`. Request/response bodies are JSON. No auth.

### Notes

```
GET    /api/notes                     List all notes (no content)
       ?folder=development            Filter by folder
       ?search=quarterly              Full-text search (title + body)
       ?sort=modified&dir=desc        Sort (modified|created|title, asc|desc)
       ?trash=true                    List trashed notes only

GET    /api/notes/:path(*)            Get a single note with content
                                      :path is url-encoded relative path

POST   /api/notes                     Create a note
       { folder: "development", filename: "new-note.md", content: "# Title\n" }

PUT    /api/notes/:path(*)            Update note content
       { content: "# Updated\n..." }

PATCH  /api/notes/:path(*)            Rename or move
       { filename: "renamed.md" }     Rename within same folder
       { folder: "operations" }       Move to another folder

DELETE /api/notes/:path(*)            Soft delete (move to .Trash/)

DELETE /api/notes/:path(*)?permanent=true   Hard delete from .Trash
```

### Folders

```
GET    /api/folders                    List folders (with note counts)

POST   /api/folders                    Create a folder
       { name: "new-folder" }

PATCH  /api/folders/:name             Rename a folder
       { name: "new-name" }

DELETE /api/folders/:name             Delete (must be empty, or
                                      moves contents to .Trash/)
```

### Images & Files

```
POST   /api/upload                     Upload a file (multipart/form-data)
                                       Images (png/jpg/gif/svg/webp) go to i/
                                       Other files go to files/
                                       Returns { markdown: "![](../i/f.png)" }
                                       or { markdown: "[f.pdf](../files/f.pdf)" }

GET    /api/images/:filename           Serve an image from i/

GET    /api/files/:filename            Serve a file from files/
```

### Git

```
GET    /api/git/status                 Repo status: { clean, ahead, behind }
```

Auto-commit and auto-pull run on server-side timers — no API trigger needed.

### Health

```
GET    /api/health                     Returns { ok: true }
```

### Error Format

```json
{ "error": "Note not found", "code": "NOT_FOUND" }
```

HTTP status codes: 200, 201, 400, 404, 409 (conflict on rename), 500.

---

## Key Design Decisions

### 1. Simplicity over power

This is the "easy mode" interface. Power users use FSNotes desktop on the
same git repo. The web version optimizes for someone who needs to quickly
look something up, or jot down a note, without installing anything.

### 2. Markdown-only, first-line-as-title

Matches FSNotes. The title shown in the note list is always the first
non-empty line. The editor shows the full markdown — no separate title input.

### 3. Filesystem-first, no database

Notes are files. Folders are directories. The server reads/writes `.md` files
on a mounted volume. This makes notes portable and interoperable with FSNotes,
VS Code, Obsidian, or any text editor with access to the same repo.

### 4. Flat folders

The existing repo has flat top-level folders (`development/`, `operations/`).
No nesting — keeps the sidebar simple and avoids the complexity of tree
navigation. To add a new organizational category, create a new folder.

### 5. Server-owned configuration

No client settings UI. Font, theme, git intervals — all set via env vars.
Every user sees the same thing. This eliminates per-user state and keeps the
app stateless from the browser's perspective.

### 6. Images live in `i/`, not per-note

The existing repo stores images in a shared `i/` directory, referenced from
notes as `![](../i/filename.png)`. The web version preserves this convention.
When a user pastes or drops an image, it's uploaded to `i/` and inserted
with the same `../i/` relative path.

### 7. Git runs in the background

Auto-commit and auto-pull are server-side timers. No manual "save" or "sync"
button needed. The git status indicator in the footer gives visibility into
the sync state, but the user doesn't need to think about git.

### 8. Wiki links navigate in-app

`[[Note Name]]` links are rendered as clickable links in the preview. Clicking
one navigates to the matching note (matched by filename, case-insensitive,
with or without `.md` extension). This is how the existing notes cross-reference
each other.

---

## Screen Layouts

### Main Screen (>= 1024px)

```
+-----------------------------------------------------------------------+
| [=]  Search: [__________________________________]      [+ New Note]   |
+-----------------------------------------------------------------------+
| Sidebar     | Note List                | Editor                       |
| 200px       | 280px                    | flex                         |
|             |                          |                              |
| ALL NOTES   | AWS architecture         | # AWS architecture           |
| ----------- |   Overview of AWS infra  |                              |
| development |   Jun 5                  | Overview of AWS infra at     |
| operations  |                          | Spyscape, including ECS,     |
| ----------- | How Dossier Generation   | RDS, and networking.         |
| Trash       |   Works                  |                              |
|             |   How the dossier PDF is | ## ECS Services              |
|             |   Jun 4                  |                              |
|             |                          | We run the following...      |
|             | Terraform                |                              |
|             |   Infrastructure as code |                              |
|             |   Jun 2                  |                              |
|             |                          |                              |
|             |                          |                              |
|             |                          |                              |
+-------------+--------------------------+------------------------------+
| git: clean                                  215 notes | development   |
+-----------------------------------------------------------------------+
```

### Main Screen (preview mode)

```
+-----------------------------------------------------------------------+
| [=]  Search: [__________________________________]      [+ New Note]   |
+-----------------------------------------------------------------------+
| Sidebar     | Note List                | Preview (read-only)          |
| 200px       | 280px                    | flex                         |
|             |                          |                              |
| ALL NOTES   | AWS architecture         | AWS architecture             |
| ----------- |   Overview of AWS infra  |                              |
| development |   Jun 5                  | Overview of AWS infra at     |
| operations  |                          | Spyscape, including ECS,     |
| ----------- | How Dossier Generation   | RDS, and networking.         |
| Trash       |   Works                  |                              |
|             |   Jun 4                  | ECS Services                 |
|             |                          |                              |
|             | Terraform                | We run the following...      |
|             |   Infrastructure as code |                              |
|             |   Jun 2                  | [Edit]                       |
|             |                          |                              |
+-------------+--------------------------+------------------------------+
| git: clean                                  215 notes | development   |
+-----------------------------------------------------------------------+
```

The right pane toggles between editor (markdown source) and preview (rendered
HTML). The toggle button is at the top of the pane.

### Mobile (< 768px) — stack navigation

**Screen 1: Sidebar**
```
+----------------------------+
| FSNotes             [Search]
+----------------------------+
| ALL NOTES              (215)
| ----------------------------
| development            (198)
| operations               (1)
| ----------------------------
| Trash                    (3)
+----------------------------+
|              [+ New Note]  |
+----------------------------+
```

**Screen 2: Note List** (after tapping a folder)
```
+----------------------------+
| [< Back]  development      |
+----------------------------+
| AWS architecture           |
|   Overview of AWS infra    |
|   Jun 5                    |
|-----------------------------|
| How Dossier Generation     |
|   Works                    |
|   How the dossier PDF is   |
|   Jun 4                    |
|-----------------------------|
| Terraform                  |
|   Infrastructure as code   |
|   Jun 2                    |
+----------------------------+
|              [+ New Note]  |
+----------------------------+
```

**Screen 3: Editor** (after tapping a note)
```
+----------------------------+
| [< Back]          [Preview] |
+----------------------------+
| # AWS architecture         |
|                             |
| Overview of AWS infra at   |
| Spyscape, including ECS,   |
| RDS, and networking.       |
|                             |
| ## ECS Services            |
|                             |
| We run the following...    |
|                             |
+----------------------------+
| [B] [I] [H] [<>] [link]   |
+----------------------------+
```

### Empty State

```
+-----------------------------------------------------------------------+
| [=]  Search: [__________________________________]      [+ New Note]   |
+-----------------------------------------------------------------------+
| Sidebar     |                                                         |
|             |                                                         |
| ALL NOTES   |           No notes yet.                                 |
| ----------- |                                                         |
| (no folders)|           Create your first note to get started.        |
| ----------- |           [+ New Note]                                  |
| Trash       |                                                         |
|             |                                                         |
+-------------+---------------------------------------------------------+
```

### Note Context Menu (right-click in note list)

```
+---------------------+
| Rename              |
| Move to...       >  |
|---------------------|
| Move to Trash       |
+---------------------+
```

### Folder Context Menu (right-click in sidebar)

```
+---------------------+
| New Note Here       |
| Rename              |
|---------------------|
| Delete Folder       |
+---------------------+
```

---

## Technology Choices

### Frontend

| Layer          | Choice                  | Why                                     |
|----------------|-------------------------|-----------------------------------------|
| Language       | TypeScript              | Type safety, tooling, ecosystem         |
| UI framework   | React                   | Component model, ecosystem, familiarity |
| Build tool     | Vite                    | Fast dev server, ESM-native             |
| Markdown parse | unified/remark          | Extensible, AST-based, well-maintained  |
| Editor         | CodeMirror 6            | Fast, extensible, markdown mode, mobile |
| Preview render | rehype (remark output)  | Pairs with remark, HTML output          |
| Syntax hl      | Shiki (in preview)      | VS Code-quality highlighting            |
| State mgmt     | Zustand                 | Lightweight, no boilerplate             |
| CSS            | Tailwind CSS            | Utility-first, fast iteration           |
| Testing        | Vitest + Testing Library| Fast, Vite-native                       |
| E2E testing    | Playwright              | Screenshot capture, Claude-friendly     |

### Backend

| Layer          | Choice                  | Why                                     |
|----------------|-------------------------|-----------------------------------------|
| Runtime        | Node.js                 | Same language as frontend               |
| Framework      | Express                 | Minimal, well-understood                |
| Git            | simple-git              | Wraps local git CLI, full feature set   |
| File watching  | chokidar                | Efficient fs watching for auto-commit   |
| Validation     | zod                     | Schema validation, shared w/ frontend   |
| Testing        | Vitest                  | Same runner as frontend                 |

### Project Structure

```
web/
  client/                        -- React frontend (Vite)
    src/
      components/
        Sidebar.tsx              -- folder list, All Notes, Trash
        NoteList.tsx             -- note rows with title/preview/date
        Editor.tsx               -- CodeMirror wrapper + toolbar
        Preview.tsx              -- rendered markdown view
        Layout.tsx               -- split panes, responsive shell
      store/
        notes.ts                 -- note CRUD, search, sort
        folders.ts               -- folder list state
        ui.ts                    -- panel visibility, selection
      lib/
        api.ts                   -- fetch wrapper for /api/*
        markdown.ts              -- remark/rehype render pipeline
        wikilinks.ts             -- [[link]] parsing and resolution
      types.ts
      App.tsx
      main.tsx
    index.html
    vite.config.ts
    tailwind.config.ts
  server/
    src/
      index.ts                   -- Express app, static serving
      routes/
        notes.ts                 -- /api/notes CRUD
        folders.ts               -- /api/folders CRUD
        git.ts                   -- /api/git/status
        images.ts                -- /api/images upload + serve
        files.ts                 -- /api/files serve
      services/
        storage.ts               -- filesystem read/write
        git.ts                   -- simple-git wrapper, auto-commit/pull
        search.ts                -- full-text search across .md files
      types.ts
    tsconfig.json
  shared/
    types.ts                     -- Note, Folder types
    validation.ts                -- zod schemas
  e2e/
    fixtures/                    -- seed notes for tests
    tests/                       -- Playwright test specs
    screenshots/                 -- failure screenshots (gitignored)
    playwright.config.ts
  package.json                   -- workspaces root
  Dockerfile
  docker-compose.yml
  docker-compose.test.yml        -- test-mode with temp volume
  tsconfig.base.json
```

---

## Testing

### E2E Tests (Playwright)

Full end-to-end tests run in a real browser against the running app. The test
suite is designed so that Claude can run it, read the results, and examine
failure screenshots to close the loop during development.

**Stack:** Playwright (Chromium) + Vitest as the runner.

**How it works:**

1. `docker compose -f docker-compose.test.yml up` starts the app with a
   temporary notes directory (seeded with fixture notes)
2. `npx playwright test` runs the E2E suite against `http://localhost:3000`
3. On failure, Playwright captures a screenshot and saves it to
   `web/e2e/screenshots/`
4. Claude reads the screenshot + test output to diagnose the issue

**Test structure:**

```
web/
  e2e/
    fixtures/                    -- seed notes for test runs
      development/
        Test Note One.md
        Test Note Two.md
      operations/
        Ops Note.md
      i/
        test-image.png
    tests/
      notes.spec.ts              -- create, edit, rename, delete, move
      folders.spec.ts            -- create, rename, delete folders
      search.spec.ts             -- full-text search
      editor.spec.ts             -- markdown editing, toolbar, preview toggle
      images.spec.ts             -- image upload, rendering in preview
      wikilinks.spec.ts          -- [[link]] navigation
      git.spec.ts                -- git status indicator
    screenshots/                 -- failure screenshots (gitignored)
    playwright.config.ts
  docker-compose.test.yml        -- app + temp volume for test isolation
```

**Key tests:**

- Create a note, verify it appears in the note list
- Edit a note, switch to preview, verify rendered output
- Search for a term, verify matching notes appear
- Upload an image, verify `![](../i/...)` inserted and image renders
- Click a `[[wiki link]]`, verify navigation to the target note
- Delete a note, verify it moves to Trash
- Rename a note, verify the note list updates
- Move a note to another folder, verify it disappears from old and appears in new
- Create and delete a folder
- Verify git status indicator shows in the footer

**Claude development loop:**

```
1. Make code changes
2. Run: npx playwright test
3. If failures:
   a. Read test output (stdout)
   b. Read failure screenshot from e2e/screenshots/
   c. Diagnose and fix
   d. Go to 2
```

### Unit / Integration Tests

- **Server:** Vitest tests for storage, search, and git services
- **Client:** Vitest + Testing Library for component rendering and store logic

---

## Deployment

### Docker

```dockerfile
FROM node:22-alpine
RUN apk add --no-cache git openssh-client

WORKDIR /app
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
COPY shared/ shared/
RUN npm ci --workspace=client --workspace=server

COPY client/ client/
COPY server/ server/
RUN npm run build --workspace=client && npm run build --workspace=server

ENV NOTES_ROOT=/data/notes
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
```

### docker-compose (local dev)

```yaml
services:
  fsnotes:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./notes-data:/data/notes
      - ./ssh-keys:/root/.ssh:ro
    environment:
      - NOTES_ROOT=/data/notes
      - GIT_AUTO_COMMIT_SECS=300
      - GIT_AUTO_PULL_SECS=60
```

### ECS

- **Task**: single container, 512 CPU / 1024 MiB
- **Storage**: EFS volume at `/data/notes`
- **SSH keys**: AWS Secrets Manager, injected at task startup
- **Network**: VPN-only security group, no public ALB
- **Health check**: `GET /api/health`
- **Single task** — no horizontal scaling (filesystem is the state)

### Environment Variables

| Variable              | Default       | Description                            |
|-----------------------|---------------|----------------------------------------|
| `NOTES_ROOT`          | `/data/notes` | Path to notes directory                |
| `PORT`                | `3000`        | HTTP listen port                       |
| `GIT_SSH_KEY`         | (none)        | Path to SSH private key for git        |
| `GIT_AUTO_COMMIT_SECS`| `300`        | Auto-commit interval (0 = disabled)    |
| `GIT_AUTO_PULL_SECS`  | `60`         | Auto-pull interval (0 = disabled)      |
| `EDITOR_FONT`         | `monospace`   | CSS font-family for the editor         |
| `EDITOR_FONT_SIZE`    | `14`          | Editor font size in px                 |
| `THEME`               | `system`      | `light`, `dark`, or `system`           |
| `CODE_THEME`          | `github-dark` | Syntax highlighting theme              |

---

## Deferred Features

| Feature               | Reason to defer                                        |
|-----------------------|--------------------------------------------------------|
| Authentication        | VPN-only for now; add if exposed publicly              |
| Encryption            | Not needed for internal knowledge base                 |
| Tags                  | Search is the primary discovery mechanism              |
| Pinning / favorites   | Not needed — sort + search is sufficient               |
| Todo / checkbox views | Not a task management tool                             |
| Nested folders        | Flat structure matches existing repo layout             |
| Note history UI       | Accessible via git directly                            |
| Keyboard shortcuts    | Browser defaults + toolbar are sufficient for now      |
| Client settings       | Env vars keep things simple and consistent             |
| Collaborative editing | Single-writer is fine for this use case                |
| MathJax / Mermaid     | Not used in existing notes                             |
