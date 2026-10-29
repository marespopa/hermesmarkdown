import Button from "@/app/components/Button";
import type { ProjectCheckUiState } from "@/app/atoms/companion-atoms";

interface ProjectCheckApprovalProps {
  state: ProjectCheckUiState;
  onApprove: () => void;
  onDeny: () => void;
}

const STATUS: Record<ProjectCheckUiState["status"], string> = {
  approval: "Waiting for your approval", running: "Running locally", completed: "Finished",
  denied: "Not approved", unavailable: "Unavailable", timed_out: "Timed out", cancelled: "Cancelled",
  failed: "Failed", nonzero_exit: "Finished with a nonzero exit code", disconnected: "Helper disconnected",
};

// Approval and result card for a fixed, local process check. It makes the
// command, project root, timeout, network policy and output destination clear.
export default function ProjectCheckApproval({ state, onApprove, onDeny }: ProjectCheckApprovalProps) {
  return (
    <section aria-label="Local project check" className="flex flex-col gap-2 rounded-xl border border-edge-subtle bg-surface-raised p-3 text-ui-caption text-fg">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-ui-subhead">{state.label}</strong>
        <span role="status" className="text-fg-muted">{STATUS[state.status]}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-fg-muted">
        <dt>Command</dt><dd className="break-all font-mono">{state.argv.join(" ")}</dd>
        <dt>Working directory</dt><dd className="break-all">{state.projectRoot}</dd>
        <dt>Time limit</dt><dd>{Math.round(state.timeoutMs / 1000)} seconds</dd>
        <dt>Network</dt><dd>Disabled where supported; best effort</dd>
        <dt>Output</dt><dd>Shown here and summarized to the companion; not saved to the thread or vault</dd>
      </dl>
      {state.status === "approval" && <p role="note" className="text-fg-muted">The helper runs the check in a disposable project copy, so the selected project tree is not modified. It is not an OS sandbox; project code may still access local resources.</p>}
      {state.detail && <p role="alert" className="text-danger">{state.detail}</p>}
      {state.output && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-fill p-2 font-mono text-ui-micro">{state.output}</pre>}
      {state.status === "approval" && (
        <div className="flex justify-end gap-2">
          <Button variant="outlined" onClick={onDeny}>Deny</Button>
          <Button variant="primary" onClick={onApprove}>Approve and run</Button>
        </div>
      )}
      {state.status === "completed" && <p className="text-fg-muted">Exit code {state.exitCode ?? "unknown"} · {state.durationMs ?? 0} ms</p>}
    </section>
  );
}
