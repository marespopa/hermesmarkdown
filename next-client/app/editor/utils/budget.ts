export function runAutoBudget(val: string): string {
  const lines = val.split("\n");
  let currentSum = 0;

  return lines
    .map((line) => {
      if (line.trim().startsWith("Total:")) {
        const newLine = `Total: $${currentSum.toFixed(2)}`;
        currentSum = 0;
        return newLine;
      }

      const currencyMatches = line.match(/-?\$(\d+(\.\d+)?)/g);

      if (currencyMatches) {
        currencyMatches.forEach((m) => {
          const num = parseFloat(m.replace("$", ""));
          if (!isNaN(num)) currentSum += num;
        });
      }
      return line;
    })
    .join("\n");
}
