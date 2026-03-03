import React, { useEffect, useState } from "react";
import Image from "next/image";
import Hero from "./subcomponents/Hero";
import Motto from "./subcomponents/Motto";
import FAQContent from "./subcomponents/FAQContent";
import Button from "../Button";
import HowItWorks from "./subcomponents/HowItWorks";
import MarkdownGuide from "./subcomponents/MarkdownGuide";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_files } from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import DialogModal from "@/app/components/DialogModal/DialogModal";

export default function LandingPage() {
  const router = useRouter();
  const [files] = useAtom(atom_files);
  const [showLoading, setShowLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const hasOpenFiles = files.length > 0;

  useEffect(() => {
    if (hasOpenFiles) {
      setShowDialog(true);
    }
  }, [hasOpenFiles]);

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
        <HowItWorks />        
        <MarkdownGuide />
        <Motto />
      </div>
    </main>
  );
}
