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
            Write Better{" "}
            <span className="bg-amber-100 text-black p-1">
              AI Prompts
            </span>
            , Faster
          </h1>

          <p className="text-xl mt-4 text-neutral-700 dark:text-neutral-300">
            The markdown editor built for prompt engineering. Slash commands for instant templates, real-time readability metrics, and zero cloud dependency. Your prompts never leave your machine.
          </p>
          <Button
            styles="mx-auto md:ml-0 grow-0 mt-6"
            variant="hero"
            onClick={() => router.push("/dashboard")}
          >
            <span className="text-2xl">
              Launch Editor →
            </span>
          </Button>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            <span>No sign-up</span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span>Works offline</span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span>Free forever</span>
          </div>
        </div>

        <div className="hidden md:flex w-full sm:w-1/2">
          <Image
            className="ml-auto"
            src={heroImage}
            alt="Hermes Markdown Editor"
            height={266}
            priority={true}
            width={400}
          />
        </div>
      </section>
    </div>
  );
}
