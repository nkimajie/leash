import { describe, expect, it } from "vitest";
import { addWords, hearMore, type Transcript } from "./use-voice-input";

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

/** Feeds what the browser showed, event by event, and returns the text you'd see. */
function hear(...events: string[]): string {
  const transcript = events.reduce<Transcript>((before, now) => hearMore(before, now), { dropped: "", latest: "" });
  return addWords(transcript.dropped, transcript.latest);
}

describe("following what the browser heard", () => {
  it("follows the words as they grow and get corrected", () => {
    expect(hear("I", "I by", "I buy water")).toBe("I buy water");
    expect(hear("I buy water", "I buy water and", "I buy water and bread")).toBe("I buy water and bread");
  });

  it("keeps the words Safari drops when it starts over after a pause", () => {
    expect(hear("I buy water and bread", "a", "a Bible")).toBe("I buy water and bread a Bible");
    expect(hear("I buy coffee every week", "")).toBe("I buy coffee every week");
  });

  it("doesn't add them twice if the whole thing comes back", () => {
    expect(hear("I buy water and bread", "a", "I buy water and bread. A Bible.")).toBe(
      "I buy water and bread. A Bible.",
    );
  });
});
