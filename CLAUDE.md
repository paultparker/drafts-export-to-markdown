# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Drafts Action for [Drafts](https://getdrafts.com/), the quick-capture note-taking app for Mac, iPhone, iPad, and Apple Watch. The action bulk-exports the Drafts database as `.md` files so they can be read by Obsidian, other markdown tools, and AI tools such as Claude Code.

Scripts in Drafts are JavaScript (ECMAScript 6) running on JavaScriptCore. Drafts extends the runtime with custom objects for working with drafts, the editor, web services, and the OS. There is no CLI build, test, or lint step — the script runs entirely inside the Drafts app as an Action step.

## Documentation

- **Drafts User Guide:** https://docs.getdrafts.com/
- **Scripting overview:** https://docs.getdrafts.com/docs/actions/scripting
- **Script API reference:** https://scripting.getdrafts.com/
- **Actions documentation:** https://docs.getdrafts.com/actions/

## Architecture

### Files

- **`Drafts Script.js`** — the main export script, run as a Drafts Action step
- **`export-if-idle.sh`** — shell wrapper that checks macOS idle time (5+ min) before triggering the silent export via URL scheme
- **`~/Library/LaunchAgents/com.paulparker.drafts-export.plist`** — launchd agent that runs `export-if-idle.sh` daily at 5am

### Drafts Actions

- **Export all drafts to files** — the main action containing `Drafts Script.js`
- **Export drafts (silent)** — wrapper action that sets `[[silent]]` template tag to `true`, then includes the main action. Used by Shortcuts and the launchd agent.

### Script Flow

1. Guard: aborts if the draft list isn't visible (safety check)
2. Queries the current workspace's "inbox" for drafts modified since last export
3. Unless silent: shows a confirmation prompt with a preview of the first 5 titles
4. Counts files before export, then exports each draft as `{first-4-words}-{UUID8}.md` to the "Export pit" Bookmark directory, preserving creation/modification dates
5. Counts files after export and runs plausibility heuristics comparing file counts against inbox and total draft counts
6. Optionally tags exported drafts with a timestamped tag (`tag_when_done`)
7. Writes `.export-metadata.json` with last export timestamp, counts, and elapsed time
8. Unless silent: shows a summary dialog with file counts, warnings, and elapsed time

### Filename Format

`{first-4-words}-{UUID8}.md` — first 4 words of `[[safe_title]]`, lowercased and joined with dashes, followed by the first 8 hex chars of the draft UUID (uppercase). Leading dots are stripped to prevent hidden files. Empty titles fall back to `{UUID8}.md`.

### Plausibility Checks

After export, six heuristics flag implausible counts with 🚨 warnings:
- Zero files after writing — bookmark path broken
- Files decreased during export — files disappeared
- Net new exceeds written — unexpected files in directory
- Fresh export shortfall (files < 99.9% of written) — write failures
- More files than total drafts — stale exports accumulating
- Files below 99.9% of inbox count — drafts missing

All passing → ✅ "Counts look plausible"

## Drafts API Objects Used

- `Bookmark` / `FileManager` — file system access via Drafts bookmarks
- `Prompt` — native UI dialogs
- `app` — application context (`currentWindow`, `currentWorkspace`)
- `context` — action lifecycle (cancel/fail)
- `script` — marks action completion
- Draft objects (`dft`) — content, metadata, tags, `processTemplate()`

## Configuration

Top-of-file constants:
- `tag_when_done` — tag drafts after export (default: `false`)
- `silent` — set via `[[silent]]` template tag; skips confirmation and completion dialogs (used by Shortcuts/automation)
