# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Hermes Markdown, please report it privately rather than opening a public issue.

- Open a [GitHub Security Advisory](https://github.com/marespopa/hermesmarkdown/security/advisories/new) for this repository, or
- Email popa.mares@gmail.com with details of the issue.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs, screenshots, or proof-of-concept code

We aim to acknowledge reports within 5 business days and will keep you updated as the issue is investigated and resolved.

## Supported Versions

Hermes Markdown is actively developed on the `trunk` branch. Only the latest version is supported with security fixes.

## Dependencies

Dependency vulnerabilities are monitored via GitHub Dependabot security alerts and `yarn npm audit` (run from `next-client/`), and addressed promptly when fixes are available. Dependabot also opens weekly version-update pull requests for the app's dependencies and the GitHub Actions used in CI (`.github/dependabot.yml`).

## Image and SVG Handling

Markdown images (PNG, JPEG, WebP) are rendered with `<img>` tags and `blob:` object URLs and are passive data. Vault SVGs, on the other hand, are XML documents that can contain scripts, event handlers and remote fetches. To preserve user privacy:

- SVGs are **never** rendered inline into the app's DOM, so their scripts never run in the app's origin.
- They are always rendered as `<img>` with sanitised `blob:` object URLs. Before a vault SVG is shown, it's passed through DOMPurify (`sanitize-svg.ts`) which strips `<script>` elements, `on*` event handlers and remote URLs.
- Raster images follow the same `<img>` + `blob:` pattern and remain passive.
- The app enforces a `Content-Security-Policy` header (`default-src 'self'; img-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'`) on every response.

To verify the behaviour manually: embed an SVG with `<script>alert(1)</script>` or an `onload` handler — no alert appears and no console error is logged; the network panel shows no request to `http://attacker.test/track` from an `<image href>`. The full check-list is in [[image-rendering]].
