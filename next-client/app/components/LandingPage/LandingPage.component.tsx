import React, { useEffect, useState } from "react";
import Features from "./subcomponents/Features";
import Hero from "./subcomponents/Hero";
import Motto from "./subcomponents/Motto";
import FAQContent from "./subcomponents/FAQContent";
import Button from "../Button";
import HowItWorks from "./subcomponents/HowItWorks";
import MarkdownGuide from "./subcomponents/MarkdownGuide";
import Testimonials from "./subcomponents/Testimonials";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import DialogModal from "@/app/components/DialogModal/DialogModal";

export default function LandingPage() {
  const router = useRouter();
  const [content] = useAtom(atom_content);
  const [showLoading, setShowLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (content && content.length > 0) {
      setShowDialog(true);
    }
  }, [content]);

  const handleConfirm = () => {
    setShowDialog(false);
    setShowLoading(true);
    setTimeout(() => {
      router.push("/dashboard/editor");
    }, 400);
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  return (
    <main data-testid="LandingPage" className="my-8">
      <LoadingOverlay isVisible={showLoading} text="Loading your content..." />
      <DialogModal isOpened={showDialog} onClose={handleCancel} styles="sm:max-h-[400px] sm:max-w-[60vw] p-2">
        <div className="flex flex-col items-center justify-center gap-6 p-2 h-full">
          <div className="text-lg font-semibold text-center">You have existing content. Would you like to continue editing it?</div>
          <div className="flex flex-wrap gap-4 justify-center mt-2">
            <Button variant="primary" onClick={handleConfirm}>Continue to Editor</Button>
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      </DialogModal>
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
        
        {/* Product Hunt Review Badge */}
        <div className="flex justify-center my-8">
          <a
            href="https://www.producthunt.com/products/hermesmd/reviews?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-hermesmd"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=553021&theme=dark"
              alt="Hermes Markdown - The Markdown Editor That Respects Your Privacy | Product Hunt"
              style={{ width: "250px", height: "54px" }}
              width={250}
              height={54}
            />
          </a>
        </div>
        
        <MarkdownGuide />
        <HowItWorks />
        <FAQContent />
        <Motto />
      </div>
    </main>
  );
}
