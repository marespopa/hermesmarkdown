# ProjectCheckApproval

Description: Shows an explicit per-invocation approval request for a fixed local project check and its bounded result. The request names the exact argv, selected project root, timeout, best-effort network policy, and output destination; result states distinguish denied, unavailable, timed out, cancelled, failed, disconnected, and nonzero exit.

## Props
| Prop | Type | Description |
|---|---|---|
| state | `ProjectCheckUiState` | Ephemeral request/result details; output is not persisted |
| onApprove | `() => void` | Approve this invocation only |
| onDeny | `() => void` | Deny this invocation |

## Execution note
The helper runs the approved check in a disposable copy of the selected project, so generated files and test changes do not modify the selected project tree. It is not an OS sandbox: project code may still access local resources available to the helper process, so the user must trust the selected project.

## Privacy
Output is capped and redacted in the local helper/client, appears only in this card and the bounded current model turn, and is omitted from saved conversation data.
