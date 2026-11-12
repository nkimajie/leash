import { describe, expect, it } from "vitest";
import { pickWaitingItem, readCommand, readFollowUp } from "./read-command";

describe("readCommand", () => {
  it.each([
    ["What can you do for me?", "what_can_you_do"],
    ["what can leash do with PayPal", "what_can_you_do"],
    ["How does this work?", "what_can_you_do"],
    ["What's waiting for me?", "whats_waiting"],
    ["Is anything pending?", "whats_waiting"],
    ["What needs my approval", "whats_waiting"],
    ["How much did I spend on coffee this week?", "look_up_spending"],
    ["What did I buy today?", "look_up_spending"],
    ["Approve the grinder", "approve"],
  ])("reads %s", (prompt, kind) => {
    expect(readCommand(prompt)?.kind).toBe(kind);
  });

  it("reads a denial, keeping your reason in your own words", () => {
    expect(readCommand("Deny the grinder, I only want hand grinders")).toEqual({
      kind: "deny",
      what: "the grinder",
      reason: "I only want hand grinders",
    });
    expect(readCommand("reject the dog bed because it's too big")).toEqual({
      kind: "deny",
      what: "the dog bed",
      reason: "it's too big",
    });
    expect(readCommand("deny it")).toEqual({ kind: "deny", what: "it", reason: null });
  });

  it("reads which page to open", () => {
    expect(readCommand("Open my money")).toEqual({ kind: "open_page", page: "money" });
    expect(readCommand("Open the control room")).toEqual({ kind: "open_page", page: "money" });
    expect(readCommand("take me to my rules")).toEqual({ kind: "open_page", page: "limits" });
    expect(readCommand("show me my leash")).toEqual({ kind: "open_page", page: "limits" });
    expect(readCommand("go to PayPal")).toEqual({ kind: "open_page", page: "paypal" });
    expect(readCommand("show my money")).toEqual({ kind: "open_page", page: "money" });
    expect(readCommand("see my twin")).toEqual({ kind: "open_page", page: "twin" });
  });

  it("leaves shopping and payments to the assistant", () => {
    expect(readCommand("Restock my coffee setup, under $60")).toBeNull();
    expect(readCommand("Restock my coffee, spend under $60")).toBeNull();
    expect(readCommand("Pay Sam $25 for dinner")).toBeNull();
    expect(readCommand("Show me what I spent on coffee today")?.kind).not.toBe("open_page");
  });
});

describe("pickWaitingItem", () => {
  const waiting = [{ title: "Baratza Encore Conical Burr Grinder" }, { title: "Payment to Morgan" }];

  it("finds the item you named", () => {
    expect(pickWaitingItem(waiting, "the grinder")).toBe(waiting[0]);
    expect(pickWaitingItem(waiting, "the burr grinders")).toBe(waiting[0]);
    expect(pickWaitingItem(waiting, "Morgan")).toBe(waiting[1]);
  });

  it("takes 'it' to mean the only thing waiting", () => {
    expect(pickWaitingItem([waiting[0]], "it")).toBe(waiting[0]);
    expect(pickWaitingItem(waiting, "it")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(pickWaitingItem(waiting, "the kettle")).toBeNull();
  });
});

describe("following up on Leash's last reply", () => {
  const offer = "Done: 1 blocked by your rules. Want me to open your limits?";

  it("opens the page Leash offered when you say yes", () => {
    expect(readFollowUp("yes, do that", offer)).toEqual({ kind: "open_page", page: "limits" });
    expect(readFollowUp("Ok", offer)).toEqual({ kind: "open_page", page: "limits" });
    expect(readFollowUp("go ahead", "Want me to open the people you pay?")).toEqual({
      kind: "open_page",
      page: "people",
    });
  });

  it("ignores anything that isn't a yes to an offer", () => {
    expect(readFollowUp("buy a PS5", offer)).toBeNull();
    expect(readFollowUp("yes", "Done: 1 paid automatically.")).toBeNull();
    expect(readFollowUp("yes", undefined)).toBeNull();
  });
});

describe("the built-in assistant never shops on a question or a no", () => {
  it.each(["How much coffee did I buy this week?", "Show me what I spent on coffee"])(
    "'%s' is a spending question",
    (prompt) => {
      expect(readCommand(prompt)).toEqual({ kind: "look_up_spending" });
    },
  );

  it.each(["what's my limit?", "How much is left today?", "how much can you spend"])(
    "'%s' asks for your limits",
    (prompt) => {
      expect(readCommand(prompt)).toEqual({ kind: "my_limits" });
    },
  );

  it.each(["Why was that blocked?", "Is the PS5 worth it?", "no", "Never mind", "stop"])(
    "'%s' is unclear, so nothing is bought",
    (prompt) => {
      expect(readCommand(prompt)).toEqual({ kind: "unclear" });
    },
  );

  it("treats 'don't buy' and 'cancel' as a deny, and 'can you approve' as asking it to approve", () => {
    expect(readCommand("Don't buy the grinder")).toEqual({ kind: "deny", what: "the grinder", reason: null });
    expect(readCommand("cancel the dog bed")).toMatchObject({ kind: "deny", what: "the dog bed" });
    expect(readCommand("Can you approve the grinder?")).toEqual({ kind: "approve" });
  });

  it("opens your limits with the change ready, but never changes them", () => {
    expect(readCommand("raise my limit to $600")).toEqual({
      kind: "open_page",
      page: "limits",
      change: "Never buy one item over $600",
    });
    expect(readCommand("increase my daily cap to $500")).toMatchObject({ change: "$500 a day" });
    expect(readCommand("change my rules")).toEqual({ kind: "open_page", page: "limits", change: undefined });
  });

  it("still shops for requests, including polite questions", () => {
    expect(readCommand("Restock my coffee setup, under $60")).toBeNull();
    expect(readCommand("Can you buy me some coffee beans?")).toBeNull();
    expect(readCommand("I need a PS5")).toBeNull();
    expect(readCommand("Pay Sam $25 for dinner")).toBeNull();
  });
});

describe("a yes is only a yes", () => {
  const offer = "Done: 1 blocked by your rules. Want me to open your limits?";

  it("doesn't mistake a command that starts politely for a yes", () => {
    expect(readFollowUp("Please deny the grinder, I only want hand grinders", offer)).toBeNull();
    expect(readFollowUp("ok, deny it", offer)).toBeNull();
    expect(readFollowUp("yes please, do that!", offer)).toEqual({ kind: "open_page", page: "limits" });
  });
});
