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
3. Checks for titles exceeding `max_title_length` (190 chars)
4. Shows two confirmation prompts (overlong warning, then title preview)
5. Exports each draft as `{optional-ISO-date} {uuid}-{safe_title}.md` to the "Export pit" Bookmark directory, preserving creation/modification dates
6. Optionally tags exported drafts with a timestamped tag (`tag_when_done`)

## Drafts API Objects Used

- `Bookmark` / `FileManager` — file system access via Drafts bookmarks
- `Prompt` — native UI dialogs
- `app` — application context (workspace, draft list visibility)
- `context` — action lifecycle (cancel/fail)
- `script` — marks action completion
- Draft objects (`dft`) — content, metadata, tags, `processTemplate()`

## Configuration

Top-of-file constants (lines 1–4):
- `tag_when_done` — tag drafts after export (default: `false`)
- `max_title_length` — filename length cap (default: `190`)
- `prefix_iso_date` — prepend ISO date to filenames (default: `true`)
