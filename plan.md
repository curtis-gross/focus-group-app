# Implementation Plan - Refactor ChatWidget Persistence and Branding

## Objective
Refactor `components/chatbot/ChatWidget.tsx` to:
1.  Remove all `localStorage` usage.
2.  Implement server-side persistence using `/api/save-run` and `/api/load-run/chat_widget_session`.
3.  Remove brand references ("Anthem", "E*Trade") and use brand-agnostic terms or `companyContext.name`.

## Technical Approach

### 1. Persistence Layer
-   Implement `saveSessionToServer()` and `loadSessionFromServer()` functions.
-   `saveSessionToServer()` will be called whenever relevant state changes (debounced if necessary, or just on every change since it's a small JSON).
-   `loadSessionFromServer()` will be called on component mount.
-   The JSON structure saved will contain:
    -   `chat_expanded`
    -   `chat_messages`
    -   `chat_workflow`
    -   `chat_workflow_step`
    -   `chat_debug_logs`
    -   `gemini_api_key` (if manually entered)

### 2. State Initialization
-   Initialize states with defaults.
-   Use `useEffect` on mount to fetch the last session and update the state.
-   Add a "Load Last Session" button in the setup screen to explicitly restore the last session if desired (as per Rule 5).

### 3. Branding Updates
-   Rename all internal keys from `anthem_chat_...` to `chat_...`.
-   Update `alt="E*Trade Agent"` to `alt={`${companyContext.name} Agent`}`.
-   Ensure all "Concierge" labels use `companyContext.name`.

### 4. Code Changes
-   Modify `ChatWidget.tsx`:
    -   Remove `localStorage` interactions.
    -   Add `fetch` calls to `/api/save-run` and `/api/load-run`.
    -   Update JSX for alt tags and labels.
-   The server already has the endpoints implemented in `server.js`.

## Verification Plan
1.  Verify that the component loads the last session on mount.
2.  Verify that changes to the chat state (sending messages, toggle expand) are saved to the server.
3.  Verify that "Anthem" and "E*Trade" are no longer present in the code or UI.
4.  Verify that `public/data/chat_widget_session_run.json` is updated correctly.

## Risks
-   Concurrency: Multiple saves might race, but since it's a single user app, it's low risk.
-   Server Latency: Saving on every message might feel laggy if not handled properly. I will use a simple `useEffect` for now, but will ensure it doesn't block the UI.
