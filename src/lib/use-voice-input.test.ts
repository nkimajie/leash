import { describe, expect, it } from "vitest";
import { addWords } from "./use-voice-input";

describe("adding what you said to what's already there", () => {
  it("adds new words after the old ones, with one space", () => {
    expect(addWords("I buy coffee", "and dog food")).toBe("I buy coffee and dog food");
    expect(addWords("I buy coffee ", " and dog food ")).toBe("I buy coffee and dog food");
  });

  it("keeps whichever part isn't empty", () => {
    expect(addWords("", "coffee")).toBe("coffee");
    expect(addWords("coffee", "")).toBe("coffee");
    expect(addWords("  ", "  ")).toBe("");
  });
});
