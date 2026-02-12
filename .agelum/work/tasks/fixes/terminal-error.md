---
created: 2026-02-11T23:46:02.218Z
state: fixes
---

# terminal-error

## Description
When changing the page and re-opening a session for a terminal that is running a CLI tool, the output is visible but typing (interaction) doesn't work.

The following error is observed at the server side:
```
 ⨯ uncaughtException:  TypeError: Invalid state: Controller is already closed
    at Socket.eval (src/app/api/(agents)/agents/route.ts:172:24)
  170 |             // Send raw buffer to client to avoid double-encoding issues
  171 |             // The client (TextDecoder) will handle the stream correctly
> 172 |             controller.enqueue(data);
      |                        ^
  173 |
  174 |             // Use stateful decoder for storage to handle split multi-byte characters
  175 |             const str = decoder.write(data); {
  code: 'ERR_INVALID_STATE'
}
```

This error likely happens because when a user navigates away, the `ReadableStream` controller is closed, but the `child.stdout.on("data")` listener is still active and tries to enqueue data into the closed controller.

Also, when re-joining a process by ID (PID/Session ID), interaction should be possible.

## Related Files
- `apps/web/src/app/api/(agents)/agents/route.ts`: Main agent execution and streaming logic.
- `apps/web/src/app/api/(agents)/agents/input/route.ts`: Agent input handling.
- `apps/web/src/app/api/(system)/terminal/route.ts`: Interactive terminal and session re-joining logic.
- `apps/web/src/lib/agent-store.ts`: Global store for active processes and output buffers.

## Tasks
- [ ] Fix `TypeError: Invalid state: Controller is already closed` by checking if the controller is still open or by properly removing listeners when the request is aborted.
- [ ] Ensure that re-joining a session allows for bidirectional interaction (typing and seeing output).
- [ ] Investigate if re-joining logic in `terminal/route.ts` can be unified or shared with `agents/route.ts`.
