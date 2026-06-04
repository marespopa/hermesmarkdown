import { DateMatch } from "../types";
import {
  REGEX_DATE_ISO,
  REGEX_DATE_SLASHED,
  REGEX_DATE_DOTTED,
  REGEX_DATE_WIKI,
} from "../components/regex";

export const findDateAtPos = (text: string, pos: number): DateMatch | null => {
  // Look in a small window around the cursor for performance
  const windowSize = 30;
  const startIdx = Math.max(0, pos - windowSize);
  const endIdx = Math.min(text.length, pos + windowSize);
  const subText = text.substring(startIdx, endIdx);

  const checkRegex = (
    regex: RegExp,
    format: DateMatch["format"],
  ): DateMatch | null => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(subText)) !== null) {
      const absoluteStart = startIdx + match.index;
      const absoluteEnd = absoluteStart + match[0].length;
      if (pos >= absoluteStart && pos <= absoluteEnd) {
        let dateStr = match[0];
        if (format === "wiki") {
          dateStr = dateStr.slice(2, -2);
        }

        let parsedDate;
        if (format === "iso" || format === "wiki") {
          parsedDate = new Date(dateStr);
        } else if (format === "slashed") {
          const [m, d, y] = dateStr.split("/").map(Number);
          parsedDate = new Date(y, m - 1, d);
        } else if (format === "dotted") {
          const [d, m, y] = dateStr.split(".").map(Number);
          parsedDate = new Date(y, m - 1, d);
        }

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          return {
            date: parsedDate,
            start: absoluteStart,
            end: absoluteEnd,
            format,
            rawString: match[0],
          };
        }
      }
    }
    return null;
  };

  return (
    checkRegex(REGEX_DATE_WIKI, "wiki") ||
    checkRegex(REGEX_DATE_ISO, "iso") ||
    checkRegex(REGEX_DATE_SLASHED, "slashed") ||
    checkRegex(REGEX_DATE_DOTTED, "dotted")
  );
};
