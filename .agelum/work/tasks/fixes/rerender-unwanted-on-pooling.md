---
created: 2026-02-12T15:27:06.736Z
state: fixes
plan: .agelum/work/plans/rerender-unwanted-on-pooling-1770910744479.md
summary: .agelum/work/summaries/rerender-unwanted-on-pooling-1770911170125.md
---

# rerender-unwanted-on-pooling

We are experiencing unwanted rerenders of the page when polling for status updates. Even when the status hasn't changed, the page still rerenders, which is inefficient.

The status check is performed by polling the `/api/app-status` endpoint. This endpoint is responsible for:
1. Checking if the project process is running (via PID or URL).
2. Checking for local file changes using the `git status --porcelain=v2 -b -u` command.
3. Checking the current branch name and its ahead/behind status relative to the remote.

The goal is to ensure that the UI only rerenders when there is an actual change in the status data returned by the API.

## Logs

The constant polling can be seen in the server logs:

```text
[15:27:06] GET /api/app-status?repo=notes 200 in 150ms
[15:27:16] GET /api/app-status?repo=notes 200 in 142ms
[15:27:26] GET /api/app-status?repo=notes 200 in 138ms
[15:27:36] GET /api/app-status?repo=notes 200 in 145ms
[15:27:46] GET /api/app-status?repo=notes 200 in 140ms
[15:27:56] GET /api/app-status?repo=notes 200 in 135ms
[15:28:06] GET /api/app-status?repo=notes 200 in 148ms
```

## Related Files

- `apps/web/src/hooks/useGitStatus.ts`: Polling logic implementation (Lines 58, 63).
- `apps/web/src/app/api/(system)/app-status/route.ts`: API endpoint that executes `git status` (Line 224).
- `apps/web/src/app/page.tsx`: Main page that triggers the status fetch (Line 229).

## Polling Frequencies

The system implements two levels of polling to balance responsiveness with performance:

- **Local Status Check (Fast):** Occurs every **10 seconds**. This checks for local file changes and the current branch state.
- **Remote Status Check (Slow):** Occurs every **10 minutes**. This performs a `git fetch` to update ahead/behind information relative to the remote repository.

