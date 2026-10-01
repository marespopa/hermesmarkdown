// @vitest-environment node
import { describe, expect, it } from "vitest";
import { greeting, timeOfDay } from "./greetings";

const at = (hour: number, minute = 0) => new Date(2026, 8, 28, hour, minute);

describe("timeOfDay", () => {
  it("splits the day at 5, 12, 17 and 22", () => {
    expect(timeOfDay(at(0))).toBe("night");
    expect(timeOfDay(at(4, 59))).toBe("night");
    expect(timeOfDay(at(5))).toBe("morning");
    expect(timeOfDay(at(11, 59))).toBe("morning");
    expect(timeOfDay(at(12))).toBe("afternoon");
    expect(timeOfDay(at(16, 59))).toBe("afternoon");
    expect(timeOfDay(at(17))).toBe("evening");
    expect(timeOfDay(at(21, 59))).toBe("evening");
    expect(timeOfDay(at(22))).toBe("night");
  });
});

describe("greeting", () => {
  it("greets by name for the time of day", () => {
    expect(greeting(at(9), "Ada")).toBe("Good morning, Ada!");
    expect(greeting(at(14), "Ada")).toBe("Good afternoon, Ada!");
    expect(greeting(at(19), "Ada")).toBe("Good evening, Ada!");
    expect(greeting(at(23), "Ada")).toBe("Up late, Ada!");
  });

  it("leaves the name out when it's empty", () => {
    expect(greeting(at(14), "  ")).toBe("Good afternoon!");
  });
});
