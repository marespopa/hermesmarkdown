// The home feed's greeting: a salutation for the time of day with the user's
// name.

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// Morning from 5, afternoon from 12, evening from 17, night from 22.
export function timeOfDay(now: Date): TimeOfDay {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

const SALUTATIONS: Record<TimeOfDay, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Up late",
};

// "Good morning, Ada!" (no name: "Good morning!").
export function greeting(now: Date, userName: string): string {
  const salutation = SALUTATIONS[timeOfDay(now)];
  const name = userName.trim();
  return name ? `${salutation}, ${name}!` : `${salutation}!`;
}
