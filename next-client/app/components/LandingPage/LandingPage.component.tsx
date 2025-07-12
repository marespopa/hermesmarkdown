import React from "react";
import Features from "./subcomponents/Features";
import Hero from "./subcomponents/Hero";
import Motto from "./subcomponents/Motto";
import FAQContent from "./subcomponents/FAQContent";
import Button from "../Button";
import HowItWorks from "./subcomponents/HowItWorks";

export default function LandingPage() {
  return (
    <main data-testid="LandingPage" className="my-8">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-2">
        {/* Choose Your Path Card */}
        <div className="bg-white rounded-xl shadow-md max-w-md mx-auto mb-10 px-4 py-6 sm:px-8 sm:py-8 border border-gray-200">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 text-center">Choose Your Path:</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">Editing Options in Hermes Markdown</h1>
          <p className="text-gray-700 text-center text-base sm:text-lg">
            Need a quick start? Choose a template and customize it to your liking. Want a blank canvas? Start from scratch and let your creativity flow. Or, perhaps you have an existing Markdown file ready to be polished? Simply open it and edit away.
          </p>
        </div>
        <Hero />
        <Features />
        <HowItWorks />
        <FAQContent />
        <Motto />
      </div>
    </main>
  );
}
