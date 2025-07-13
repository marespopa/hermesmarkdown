import React from "react";
import Features from "./subcomponents/Features";
import Hero from "./subcomponents/Hero";
import Motto from "./subcomponents/Motto";
import FAQContent from "./subcomponents/FAQContent";
import Button from "../Button";
import HowItWorks from "./subcomponents/HowItWorks";
import MarkdownGuide from "./subcomponents/MarkdownGuide";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <main data-testid="LandingPage" className="my-8">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        <Hero />
        {/* Choose Your Path Card */}
        <div className="mt-6 md:mt-0 bg-white dark:bg-gray-800 rounded-xl shadow-md max-w-md mx-auto mb-10 px-4 py-6 sm:px-8 sm:py-8 border border-gray-200 dark:border-gray-700">
          <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 text-center">Choose Your Path:</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Editing Options in Hermes Markdown</h1>
          <p className="text-gray-700 dark:text-gray-300 text-center text-base sm:text-lg mb-6">
            Need a quick start? Choose a template and customize it to your liking. Want a blank canvas? Start from scratch and let your creativity flow. Or, perhaps you have an existing Markdown file ready to be polished? Simply open it and edit away.
          </p>
          <div className="flex justify-center">
            <Button
              variant="primary"
              handler={() => router.push("/dashboard")}
              styles="px-6 py-3 text-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
        <Features />
        <MarkdownGuide />
        <HowItWorks />
        <FAQContent />
        <Motto />
      </div>
    </main>
  );
}
