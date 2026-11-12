"use client";

import { useState } from "react";
import Button from "@/app/components/Button/Button.component";

const VIDEO_URL = "https://www.youtube-nocookie.com/embed/ZY_8C1YV5BI?autoplay=1";

export default function LandingVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-edge bg-fill">
      {playing ? (
        <iframe
          src={VIDEO_URL}
          title="HermesMarkdown video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero/video-poster.jpg"
            alt="HermesMarkdown editor with the words: Markdown notes and code, right in your browser."
            width={1280}
            height={720}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Button variant="primary" onClick={() => setPlaying(true)}>
              Watch the video
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
