import React from "react";

interface Props {
  isVisible: boolean;
  text?: string;
}

const LoadingOverlay = ({ isVisible, text = "Loading..." }: Props) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg px-8 py-6 flex flex-col items-center gap-4 min-w-[180px]">
        <span className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500" />
        <span className="text-base text-gray-800 font-medium">{text}</span>
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
