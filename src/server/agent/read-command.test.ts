import { describe, expect, it } from "vitest";
import { pickWaitingItem, readCommand } from "./read-command";

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
