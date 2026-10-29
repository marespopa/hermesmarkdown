"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { disconnectProjectCheckHelper, pairProjectCheckHelper, projectCheckPairing } from "@/app/services/project-check-helper-client";

// Pair a user-started loopback helper. The user selects its project root in
// the terminal; the browser never derives a path from a vault handle.
export default function ProjectCheckSettings() {
  const [code, setCode] = useState("");
  const [paired, setPaired] = useState(projectCheckPairing());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pair = async () => {
    setPending(true); setError(null);
    try { await pairProjectCheckHelper(code); setPaired(projectCheckPairing()); setCode(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not pair the helper."); }
    finally { setPending(false); }
  };
  const disconnect = () => { disconnectProjectCheckHelper(); setPaired(projectCheckPairing()); };

  return (
    <section className="mt-5 rounded-xl border border-edge-subtle p-4" aria-labelledby="project-check-title">
      <h3 id="project-check-title" className="mb-1 text-ui-headline font-semibold">Local project checks</h3>
      <p className="mb-3 text-ui-caption text-fg-muted">Project checks run only through a helper you start and pair. From the repository directory, choose the project root explicitly:</p>
      <pre className="mb-3 overflow-x-auto rounded-lg bg-fill p-2 text-ui-caption">node helper/start.mjs --root /absolute/path/to/next-client</pre>
      <p className="mb-3 text-ui-caption text-fg-muted">Keep its terminal open, then enter its one-time pairing code. Every check still asks for approval. Checks run in a disposable project copy, so the selected tree is not modified. Network denial is best effort and the helper is not an OS sandbox; project code may access local resources, so pair only projects you trust.</p>
      {paired.paired ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-ui-caption text-fg-muted">Paired project: {paired.projectRoot}</span>
          <Button variant="secondary" onClick={disconnect}>Disconnect helper</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input name="project-check-pair-code" aria-label="Helper pairing code" value={code} handleChange={(event) => setCode(event.target.value)} placeholder="One-time pairing code" />
          <Button variant="secondary" disabled={pending || !code.trim()} onClick={() => void pair()}>{pending ? "Pairing…" : "Pair helper"}</Button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-ui-caption text-danger">{error}</p>}
    </section>
  );
}
