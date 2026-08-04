# E2B Migration Plan

We will migrate incrementally and keep WebContainers working until E2B reaches feature parity. Each step requires approval before moving to the next one.

## 1. E2B foundation

Add the server-only E2B SDK, environment variables, runtime types, and configuration. Confirm the Node/Vite sandbox template and port strategy without changing the active WebContainer runtime.

## 2. Sandbox lifecycle

Create authenticated endpoints for sandbox creation, reconnection, timeout, restart, shutdown, and cleanup. Associate each sandbox with its project and owner so E2B credentials and privileged operations never reach the browser.

## 3. File synchronization

Upload the complete project when starting a sandbox, then support debounced file writes, creates, renames, and deletes. Keep the database as the source of truth and synchronize AI-generated changes as they stream in.

## 4. Install, run, and preview

Install dependencies and run the Vite development server inside E2B. Stream status and logs to the workspace, obtain the hosted preview URL, and switch the preview iframe and restart controls to E2B.

## 5. Interactive terminal

Keep the existing xterm interface but replace direct WebContainer access with an authenticated E2B-backed transport supporting terminal input, output, and resizing.

## 6. Complete cutover

Remove `@webcontainer/api`, the WebContainer service and connect route, cross-origin-isolation headers, related imports, and WebContainer-specific product copy. Relocate generic file helpers, update documentation and AI prompts, then run type checking, production build, and end-to-end workspace checks.

## Working agreement

We will implement exactly one step at a time. Before each step, review the intended files, behavior, and decisions. After each step, review the resulting diff and verification results before approving the next step.
