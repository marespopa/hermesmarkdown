# LandingVideo

Description: The home page hero's product video, as a click-to-load facade: a 16:9 box with the video's poster (`/assets/hero/video-poster.jpg`, served from the site so the CSP's `img-src` needs no new host) and a **Watch the video** button. One click replaces the poster with a `youtube-nocookie.com` iframe that starts playing. Nothing is requested from YouTube before the click.

## Local State & Storage
- State: `playing` (useState).
- Persistence: none.

## Dependencies
- Core: `Button`.
- Zero-Cloud: No request until the visitor presses the button; then only the YouTube embed (allowed by `frame-src` in `next.config.js`, disclosed in the privacy policy).

## Quick Usage
```tsx
import LandingVideo from "@/app/components/LandingPage/LandingVideo";

<LandingVideo />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
