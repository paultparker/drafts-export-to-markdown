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

**`Drafts Script.js`** — the entire project. Flow:

1. Guard: aborts if the draft list isn't visible (safety check)
2. Queries the current workspace's "inbox" for all drafts
3. Shows a confirmation prompt with a preview of the first 10 titles
4. Exports each draft as `{first-4-words}-{UUID8}.md` to the "Export pit" Bookmark directory, preserving creation/modification dates. Words are lowercased and joined with dashes; UUID8 is the first 8 hex chars of the draft UUID (uppercase).
5. Skips unchanged drafts: compares `dft.modifiedAt` against the existing file's modification date (at second granularity) and only rewrites files where the draft is newer
6. Optionally tags exported drafts with a timestamped tag (`tag_when_done`)
7. Writes `.export-metadata.json` to the export directory with last export timestamp, counts, and elapsed time
8. Logs start/end times and summary to Action Log, and shows a modal summary dialog

## Drafts API Objects Used

- `Bookmark` / `FileManager` — file system access via Drafts bookmarks
- `Prompt` — native UI dialogs
- `app` — application context (`currentWindow`, `currentWorkspace`)
- `context` — action lifecycle (cancel/fail)
- `script` — marks action completion
- Draft objects (`dft`) — content, metadata, tags, `processTemplate()`

## Configuration

Top-of-file constant (line 2):
- `tag_when_done` — tag drafts after export (default: `false`)
