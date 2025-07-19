import React from "react";
import Features from "./subcomponents/Features";
import Hero from "./subcomponents/Hero";
import Motto from "./subcomponents/Motto";
import FAQContent from "./subcomponents/FAQContent";
import Button from "../Button";
import HowItWorks from "./subcomponents/HowItWorks";
import MarkdownGuide from "./subcomponents/MarkdownGuide";
import Testimonials from "./subcomponents/Testimonials";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <main data-testid="LandingPage" className="my-8">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        <Hero />
        {/* Choose Your Path Card */}
        <div className="mt-12 bg-white dark:bg-neutral-800 rounded-xl shadow-md max-w-md mx-auto mb-16 px-6 py-8 sm:px-10 sm:py-10 border border-neutral-200 dark:border-neutral-700 flex flex-col gap-6">
          <div className="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-4 text-center">Choose Your Path:</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-neutral-900 dark:text-white">Editing Options in Hermes Markdown</h1>
          <ul className="text-neutral-700 dark:text-neutral-300 text-center text-base sm:text-lg mb-8 flex flex-col gap-3 list-none">
            <li>🚀 <b>Quick start:</b> Choose a template and customize it to your liking.</li>
            <li>📝 <b>Blank canvas:</b> Start from scratch and let your creativity flow.</li>
            <li>📂 <b>Already have a file?</b> Open your Markdown file and polish it with powerful editing tools.</li>
          </ul>
          <div className="flex justify-center mt-2">
            <Button
              variant="hero"
              onClick={() => router.push("/dashboard")}
            >
              Get Started
            </Button>
          </div>
        </div>
        <Features />
        <Testimonials />
        <MarkdownGuide />
        <HowItWorks />
        <FAQContent />
        <Motto />
      </div>
    </main>
  );
}
