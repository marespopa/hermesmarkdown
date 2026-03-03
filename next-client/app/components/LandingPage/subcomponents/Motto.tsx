"use client";

import { containerStyle } from "@/app/constants/styles";
import Button from "../../Button";
import { useRouter } from "next/navigation";

export default function Motto() {
  const router = useRouter();

  return (
    <div className={`${containerStyle}`}>
      <section className="text-center w-full md:w-2/3 mx-auto mb-4 py-12 px-4">
        <h3 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
          Local-First Prompt Engineering
        </h3>
       
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
        Draft, refine, and organize your prompts locally, without the cloud. No data leaks, no monthly fees - just better prompts. 
        </p>
        <div className="mx-auto flex justify-center">
          <Button variant="hero" onClick={() => router.push("/dashboard")}>
            Start Drafting →
          </Button>
        </div>
      </section>
    </div>
  );
}
