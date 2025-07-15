"use client";

import Image from "next/image";
import Button from "../../Button";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();
  const heroImage = "/assets/hero/niceday@2x.jpg";

  return (
    <div className="container max-w-screen-xl mx-auto">
      <section className="flex flex-wrap mt-4 sm:mt-8 md:mt-16 items-center">
        <div className="w-full mx-auto md:w-1/2 prose prose-neutral dark:prose-invert flex flex-col justify-center sm:px-4 xl:px-0">
          <h1 className="text-5xl mt-8 leading-tight text-neutral-900 dark:text-white">
            Write{" "}
            <span className="bg-amber-100 text-black p-1">
              Freely, Securely, and Locally
            </span>
          </h1>

          <p className="text-xl mt-4 text-neutral-700 dark:text-neutral-300">
            Hermes Markdown makes it easy to work with your markdown files. Create or edit documents with a simple, smooth experience—no hassle, just results.
          </p>
          <p className="text-xl mt-4 text-neutral-700 dark:text-neutral-300">
            Use handy features like ready-made templates, live preview, keyboard shortcuts, and code blocks with syntax highlighting to make writing and coding faster and easier.
          </p>
          <p className="text-lg mt-4 text-neutral-700 dark:text-neutral-300">
            Your privacy matters: everything stays on your device. Hermes Markdown never sends your content to any server, so you keep full control and security over your work.
          </p>
          <Button
            styles="mx-auto md:ml-0 grow-0 mt-6"
            variant="hero"
            onClick={() => router.push("/dashboard")}
          >
            <span className="text-2xl">
              Start <span className="text-xs align-super -mt-4">100% free</span>
            </span>
          </Button>
        </div>

        <div className="hidden md:flex w-full sm:w-1/2">
          <Image
            className="ml-auto"
            src={heroImage}
            alt="Markdown for a nice day"
            height={266}
            priority={true}
            width={400}
          />
        </div>
      </section>
    </div>
  );
}
