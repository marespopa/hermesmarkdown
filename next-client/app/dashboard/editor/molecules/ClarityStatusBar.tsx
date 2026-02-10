import {
  ClarityResult,
  getClarityDotColor,
} from "@/app/services/prompt-clarity";

interface Props {
  stats: {
    words: number;
    tokens: number;
    clarity: ClarityResult;
  };
}

const ClarityStatusBar = ({ stats }: Props) => {
  return (
    <div className="flex-shrink-0 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl gap-2 flex-wrap">
      <span>
        {stats.words} words • ~{stats.tokens} tokens
      </span>
      <div className="flex items-center gap-3">
        {/* Prompt Clarity Indicator */}
        <span
          className={`flex items-center gap-1 ${stats.clarity.color}`}
          title={
            stats.clarity.tips.length > 0
              ? `Tips: ${stats.clarity.tips.join(", ")}`
              : "Prompt clarity score"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${getClarityDotColor(
              stats.clarity.label
            )}`}
          ></span>
          {stats.clarity.label}
          {stats.clarity.tips.length > 0 && (
            <span className="text-neutral-400 dark:text-neutral-500 ml-1 hidden sm:inline">
              · {stats.clarity.tips[0]}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default ClarityStatusBar;
