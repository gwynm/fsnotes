# FSNotes

[简体中文](README_zh_CN.md)
[繁體中文](README_zh_TW.md)

FSNotes is modern notes manager for macOS and iOS.

## macOS app

<a href="https://itunes.apple.com/app/fsnotes/id1277179284">
	<img src="https://fsnot.es/img/badge-download-on-the-mac-app-store.svg" alt="">
</a>

<img src="https://fsnot.es/img/fsnotes7/FSNotes7_macOS_Dark.webp?v=2" alt="macOS FSNotes" style="max-width:100%;">

### Key features

- **Markdown-first**. Also supports any plaintext files.
- **Fast and lightweight**. Works smoothly with 10k+ files.
- **Access anywhere**. Sync with iCloud Drive or Dropbox.
- **Multi-folder** storage.
- **Keyboard-centric**.  
- **Syntax highlighting** within code blocks. Supports over 30 programming languages.
- **In-line image** support.
- Organize with **tags**.
- **Cross-note links** using `[[double brackets]]`.
- **Elastic two-pane view**.
- **External editor** support (changes seamless live sync with UI).
- **Pin** important notes.
- **Quickly copy notes** to the clipboard.
- **Dark mode**.
- AES-256 **encryption**.
- **Mermaid and MathJax** support.
- Optional **Git versioning** and **backups**.

---

## iOS app

<a href="https://itunes.apple.com/app/fsnotes-manager/id1346501102">
	<img src="https://fsnot.es/img/badge-download-on-the-app-store.svg" alt="">
</a>

<img width="300" alt="FSNotes for iOS" src="https://fsnot.es/img/fsnotes7/FSNotes7_iOS.webp?v=2"> <img width="300" alt="FSNotes for iOS" src="https://fsnot.es/img/fsnotes7/FSNotes7_iOS_Dark.webp?v=2">

### Key features

- **Sync via iCloud Drive**.
- **3D Touch** and **configurable keyboard**.
- **TextBundle** and **EncryptedTextBundle** containers.
- **Pinned** notes kept in sync with the desktop app.
- **Dynamic fonts**.
- **Dark mode**.
- **Sharing** extension.
- **Encrypted note** support.
- **Encrypted folders** support.
- **Git** integration.
- **Web Pages** Creation.

---

## Data Model

FSNotes organizes your notes using three core concepts: **Storage**, **Projects**, and **Notes**.

### Storage

FSNotes has a single **Default Storage** location configured in Preferences → General. This is the root directory where FSNotes looks for your notes. It can be:

- **iCloud Drive** (default) — syncs across devices
- **Local Documents** folder
- **Custom path** — any folder you choose

All projects and notes live within or alongside this storage location.

### Projects

A **Project** is FSNotes' representation of a folder. There are four types:

**Default Project (Inbox)**
- The root folder at your Default Storage location
- Always exists and cannot be removed
- Contains your main notes and any nested subfolders
- Shown as "Inbox" in the sidebar

**Nested Projects**
- Subfolders within the Default Project or within other nested projects
- Automatically discovered when you create folders on disk
- Appear indented under their parent in the sidebar
- Inherit settings from their parent unless explicitly overridden

**Bookmark Projects**
- External folders added via File → Add External Folder
- Can be located anywhere on your filesystem, outside Default Storage
- Useful for accessing existing folder structures or separating work/personal notes
- **Visual note**: In the sidebar, Bookmark Projects look identical to nested projects (subfolders of Inbox) — both just show the folder name. To distinguish them, right-click → Show Options: only Bookmark Projects (and Inbox) show the Git configuration section.

**Virtual Projects**
- Not real folders — they're filtered views across all your notes
- **Notes** (a.k.a. "All Notes"): Shows every note from every project combined
- **Todo**: Shows notes containing checkbox/todo items  
- **Untagged**: Shows notes without any tags
- Note: Right-click → Show Options on a virtual project shows Git settings, but these are **redirected to the Default Project (Inbox)**. Configuring Git on "Notes" actually configures Inbox.

**Trash**
- The `.Trash` folder within Default Storage
- A real folder, but with special handling (deleted notes go here)

### Notes

Each note is a file on disk (`.md`, `.txt`, `.textbundle`, etc.). Notes:

- Belong to exactly one Project (the folder containing them)
- Inherit their Project's settings (sorting, Git configuration, etc.)
- Can be organized with tags extracted from content (`#tag`)

### Sidebar Structure

The sidebar displays items in this order:

1. **System items** (visibility configurable):
   - **Notes**: Virtual — shows all notes from all projects
   - **Inbox**: The Default Project (your root storage folder)
   - **Todo**: Virtual — shows notes with checkboxes
   - **Untagged**: Virtual — shows notes without tags
   - **Trash**: The `.Trash` folder
2. **Projects**: Subfolders of Inbox + any Bookmark Projects you've added
3. **Tags**: Hierarchical tags extracted from note content (if enabled)

### Project Hierarchy and Inheritance

Projects form a tree structure. The Default Project is the root, with nested folders as children. Bookmark Projects are independent roots. Settings flow down the hierarchy — a note in `Projects/Work/2024/` inherits configuration from the nearest ancestor that has it set.

---

## Git Integration

FSNotes provides optional Git versioning for your notes, allowing you to track changes, sync with remote repositories, and restore previous versions.

### Per-Project Repositories

Git is configured at the **project level**, not globally. This means:

- Each root-level project (Default Project or Bookmark Project) can have its own independent Git repository
- Nested projects inherit Git from their parent — they don't get separate repositories
- A note belongs to whichever Git repository its containing project (or nearest ancestor with Git configured) uses

This allows you to have a single repository for all notes, or multiple repositories for different purposes.

### Configuration

There are two places to configure Git:

**Preferences → Git** (global settings + Default Project):

*Global settings (affect all projects):*
- **Git Storage path**: Where `.git` directories are stored when using centralized mode
- **Separate .git in project dir**: Toggle between centralized and in-folder repository storage
- **Backup mode**: Manual or automatic commit/push at configured intervals
- **Pull interval**: How often to automatically pull (when automatic backup is enabled)
- **Ask commit message**: Whether to prompt for a message on each commit

*Default Project settings (the section at the bottom):*
- **Origin**: The remote repository URL for the Default Project (Inbox)
- **Private Key / Passphrase**: SSH credentials for the Default Project
- **Clone/Pull/Push button**: Trigger Git operations for the Default Project

**Right-click project → Show Options → Git section** (per-project):
- **Origin**: The remote repository URL for this specific project
- **Private Key / Passphrase**: SSH credentials for this project
- **Clone/Pull/Push button**: Trigger Git operations for this project
- Only shown for root-level projects (Inbox, Bookmark Projects) — not for nested subfolders or Trash

**Important equivalences:**
- The "Origin" field in Preferences → Git and in Inbox's Show Options are the **same setting**
- Right-clicking "Notes" (virtual) → Show Options shows Git settings, but these **actually configure Inbox** (the Default Project). The UI silently redirects virtual projects to Inbox for Git configuration.

### Repository Storage: Default Storage vs Git Storage

These two paths serve completely different purposes:

- **Default Storage** (Preferences → General): Where your note files live on disk
- **Git Storage** (Preferences → Git): Where `.git` directories are stored when using centralized mode

They are independent. For example, your notes might be in `~/Documents/Notes/` while Git repositories are stored in `~/Library/Application Support/FSNotes/Repositories/`.

### The "Separate .git in project dir" Option

This setting controls where FSNotes **looks for** the `.git` directory:

**When DISABLED (default — centralized storage):**
- The `.git` repository data is stored in the "Git Storage" folder
- Repository names use the format `[hash] - [project name].git` (e.g., `a1b2 - Work.git`)
- The repository's `core.worktree` config points to your notes folder in Default Storage
- Your notes folder contains only working files (no `.git` subfolder)
- Advantage: Keeps `.git` directories out of synced folders; project directories stay clean

Technical detail: When cloning, FSNotes clones to a temp folder, configures `core.worktree` to point to your notes location, moves only the `.git` contents to Git Storage, then deletes the temp clone. Checkout then populates your notes folder via the worktree config.

**When ENABLED (traditional layout):**
- FSNotes looks for `.git` inside each project folder (standard Git layout)
- The "Git Storage" path is not used for locating repositories

**Exception — iCloud Drive**: Projects stored in iCloud Drive **always** use centralized storage, regardless of this setting. iCloud syncs `.git` directories, which causes conflicts when multiple devices push changes. FSNotes forces centralized storage for iCloud projects to prevent corruption.

**Important**: Toggling this setting does **not** migrate existing repositories. If you switch from centralized to separate (or vice versa), any existing `.git` directories in the old location become orphaned — FSNotes simply stops looking there. You would need to manually move or delete the old repositories.

### Git Operations

**Manual operations:**
- **Menu bar**: File → Commit & Push (or ⌘S) — operates on the **currently selected project only**
- **Project settings**: The Clone/Pull/Push button — operates on that specific project

**Automatic operations** (when "Commit/Push every" is selected in Preferences → Git):

The timers are **global** — all Git-enabled projects share the same schedule. You cannot configure different intervals per project.

- **Snapshot timer**: Checks every 5 seconds, but only acts at the configured hour interval (e.g., every 1 hour) at the specified minute. When triggered, it iterates through **all projects with Git origin configured** and performs: commit → pull → push on each.
- **Pull timer**: Runs every `pullInterval` seconds (minimum 10). Pulls from **all Git-enabled projects** — no commit or push, just pull.

Example: With "every 1 hours" at minute "5" and pull interval "10":
- At 1:05, 2:05, 3:05...: all Git projects get commit → pull → push
- Every 10 seconds: all Git projects get pull only

**Note history:**
- Right-click a note → History to see previous commits affecting that note
- Select a commit to restore that version
- Only available for notes in projects that have been committed

### Typical Workflows

**Single repository for all notes:**
1. Configure Git origin on your Default Project (Inbox)
2. All nested folders and their notes are tracked in this single repository

**Multiple independent repositories:**
1. Add external folders as Bookmark Projects
2. Configure Git origin separately on each Bookmark Project
3. Each becomes an independent repository with its own remote

**Work + Personal separation:**
1. Keep personal notes in Default Storage with one Git remote
2. Add work folder as a Bookmark Project with a different Git remote
3. Each syncs independently to different repositories

---

## Settings Storage

FSNotes stores settings in several locations depending on the type of data:

### Application Preferences

**macOS**: Standard UserDefaults plist file:
```
~/Library/Preferences/co.fluder.FSNotes.plist
```

This file stores all application-wide settings including:
- UI preferences (font, theme, sidebar visibility)
- Default storage path
- Git global settings (repository storage path, backup intervals, SSH credentials for the main project)
- Editor settings (line spacing, syntax highlighting options)

**iOS**: App group UserDefaults (shared with extensions):
```
group.es.fsnot.user.defaults
```

### iCloud-Synced Settings

Some settings sync across devices via `NSUbiquitousKeyValueStore`:
- Sort order preferences
- Upload key (for web publishing)

### Per-Project Settings

Each project stores its own settings (sort order, Git origin, SSH keys, etc.) separately:

**Format**: Binary plist (NSKeyedArchiver)

**Location** (varies by build):
- **App Store builds**: iCloud key-value storage (`NSUbiquitousKeyValueStore`)
- **Other builds**: `~/Library/Application Support/es.fsnot.project-settings<hash>`

The `<hash>` is an MD5 of the project path, making the filename unique per project.

**Contents** (per `ProjectSettings.swift`):
- Sort preferences (field, direction)
- Display options (show in sidebar, show nested content)
- Git configuration (origin URL, private key data, passphrase)

### Sandbox Bookmarks

For accessing external folders (Bookmark Projects), FSNotes stores security-scoped bookmarks to maintain access across launches. These are stored in UserDefaults.

---

## UI Development (macOS)

### Framework and Paradigm

FSNotes uses **AppKit** with **Storyboards** for the macOS UI:

- **UI Framework**: AppKit (Cocoa) — `NSViewController`, `NSView`, `NSButton`, `NSTextField`, etc.
- **Layout System**: Auto Layout with constraints
- **UI Definition**: Single storyboard file containing all scenes

### Key Files

| File | Purpose |
|------|---------|
| `FSNotes/Base.lproj/Main.storyboard` | All macOS UI — main window, preferences tabs, dialogs (~5000 lines of XML) |
| `FSNotes/Preferences/*.swift` | View controllers for each preferences tab |
| `FSNotes/ViewController.swift` | Main window controller |
| `FSNotes/View/*.swift` | Custom view subclasses |

### Storyboard Structure

The storyboard contains multiple **scenes**, each representing a view controller:

- **Application scene**: Menu bar and app-level connections
- **Main window scene**: The primary notes interface (sidebar, note list, editor)
- **Preferences scenes**: One per tab (General, Git, Editor, etc.)
- **Dialog scenes**: About window, password dialogs, etc.

Each scene has:
- A **view controller** (linked to a Swift class via `customClass`)
- **IBOutlets**: Connections from UI elements to Swift properties
- **IBActions**: Connections from UI events to Swift methods
- **Constraints**: Auto Layout rules defining element positions

### Development Workflow

**Xcode Visual Editor (Recommended)**:
1. Open `FSNotes.xcworkspace` in Xcode
2. Select `Main.storyboard` in the navigator
3. Use Interface Builder to visually edit layouts
4. Drag connections between UI and code (outlets/actions)
5. Preview changes in the canvas

**Manual XML Editing** (for targeted fixes):
- Storyboard files are XML — editable in any text editor
- Each element has a unique `id` attribute (e.g., `id="FjG-Kz-Df1"`)
- Position/size set via `<rect key="frame" x="..." y="..." width="..." height="..."/>`
- Constraints defined in `<constraints>` blocks
- **Caution**: Easy to break — Xcode validates and auto-formats on save

**Which to use**:
- **Visual editor**: Layout changes, adding elements, connecting outlets
- **Text editor**: Bulk find/replace, understanding structure, precise coordinate tweaks

### Rapid Iteration

Unfortunately, **full rebuild is required** to see UI changes — there's no hot reload for AppKit storyboards.

**Fastest iteration cycle**:
```bash
# Quick build (arm64 only, active arch, no cleaning)
xcodebuild -workspace FSNotes.xcworkspace -scheme "FSNotes" build \
  -destination "platform=macOS,arch=arm64" ONLY_ACTIVE_ARCH=YES -quiet

# Run the built app
open ~/Library/Developer/Xcode/DerivedData/FSNotes-*/Build/Products/Debug/FSNotes.app
```

**Tips**:
- Keep Xcode open — subsequent builds are incremental and faster
- Use `⌘B` in Xcode to build, `⌘R` to build and run
- For storyboard-only changes, build is typically 5-15 seconds

### Common Tasks

**Adding an outlet**:
1. In storyboard, select the UI element
2. Open Assistant Editor (View → Assistant → Show Assistant Editor)
3. Ctrl-drag from element to Swift file to create `@IBOutlet`

**Adding an action**:
1. Ctrl-drag from control (button, etc.) to Swift file
2. Select "Action" in the popup
3. Creates `@IBAction func methodName(_ sender: ...)`

**Fixing layout issues**:
1. Open storyboard in Xcode
2. Drag elements to desired positions visually
3. Select affected views (or the container)
4. **Editor → Resolve Auto Layout Issues → Update Constraint Constants** — makes constraints match your visual layout
5. If constraints are too tangled: **Clear Constraints**, reposition, then **Add Missing Constraints**

**Important**: Xcode maintains two positioning systems simultaneously:
- **Frame**: The visual position in the canvas (what you see when dragging)
- **Constraints**: Auto Layout rules that determine position at runtime

At runtime, **constraints win**. If you drag elements without updating constraints, you'll see `misplaced="YES"` warnings in the XML, and the app will render using the old constraint positions.

| Menu Option | Effect |
|-------------|--------|
| **Update Constraint Constants** | Adjusts constraints to match where you dragged elements |
| **Update Frames** | Moves elements to where constraints say they should be (undoes your dragging) |
| **Clear Constraints** | Removes all constraints from selected views |
| **Add Missing Constraints** | Xcode guesses constraints based on current positions |

---

## Building from Source

### Prerequisites

- macOS 12.4 or later
- Xcode (with command line tools)

### Build Command

```bash
xcodebuild -workspace FSNotes.xcworkspace -scheme "FSNotes" build -destination "platform=macOS,arch=arm64" ONLY_ACTIVE_ARCH=YES
```

Add `-quiet` to suppress verbose output.

### Build Output

The built application is located at:

```
~/Library/Developer/Xcode/DerivedData/FSNotes-<hash>/Build/Products/Debug/FSNotes.app
```

To find the exact path:

```bash
xcodebuild -workspace FSNotes.xcworkspace -scheme "FSNotes" -showBuildSettings | grep "BUILT_PRODUCTS_DIR"
```

To open the build folder in Finder:

```bash
open "$(xcodebuild -workspace FSNotes.xcworkspace -scheme 'FSNotes' -showBuildSettings 2>/dev/null | grep ' BUILT_PRODUCTS_DIR' | head -1 | sed 's/.*= //')"
```

---

## License

FSNotes is written in **Swift 5** and is open source (MIT license).
