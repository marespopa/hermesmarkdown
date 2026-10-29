# ProposalReview

Shows the session-only review cards created by Companion file-edit tools. Each
card has a side-by-side current/proposed text comparison and an interactive
hunk walkthrough. It shows a concise summary, current step, user-facing
rationale and impact (only when requested), and Previous/Next/Accept/Reject
controls. Accept and Reject advance to the next hunk. Mod-Alt-N/P navigate,
Mod-Alt-A/R decide, and Mod-Alt-Space shows or hides rationale and impact.
The active hunk scrolls and focuses the active editor, while other pending
hunks remain subtly marked. The card writes only after **Apply accepted
changes** is pressed, using the existing Companion writer and refusing to
apply when the source file changed since proposal creation.

Pending hunks are also drawn inline in the editor as ghost diffs: replaced text
is struck through and the proposed text appears faintly after it (see
`codemirror/proposal-feedback.ts`). **Discard** drops the whole proposal without
writing anything.

The active hunk also carries small Accept / Reject buttons in the editor itself
(`HunkControlsWidget`); they decide the hunk and move to the next one
(`decideHunk`), the same as the card's buttons and Mod-Alt-A / Mod-Alt-R.
