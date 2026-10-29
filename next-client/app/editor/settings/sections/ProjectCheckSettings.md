# ProjectCheckSettings

Description: Pairs or disconnects the explicitly started loopback project-check helper from AI settings. The helper is user-selected and runs at a fixed loopback address. Pairing tokens stay in memory until disconnect or helper shutdown; disconnect clears the browser token.

## State and props
- No props. Local state holds only the pairing code, paired project label, pending state and error.
- The user chooses the project root when starting `helper/start.mjs`; the app never infers it from a browser vault handle.
- Pairing contacts the helper on `127.0.0.1`; there is no cloud relay.

## Security copy
The section explains per-run approval, disposable-copy execution, best-effort network denial and that the helper is not an OS sandbox. Running unit tests executes code from the selected project copy and may access local resources; only pair projects you trust.
