/** An error returned by PayPal, kept in a shape the rest of the app can show and store. */
export class PayPalError extends Error {
  constructor(
    /** details[0].issue from PayPal, e.g. "INSTRUMENT_DECLINED". */
    public readonly issue: string,
    /** debug_id from PayPal; stored on the decision so the failure can be traced. */
    public readonly debugId: string,
    message: string,
  ) {
    super(message);
    this.name = "PayPalError";
  }

  get isDeclined() {
    return this.issue === "INSTRUMENT_DECLINED";
  }

  /** What went wrong, in words a person understands. Falls back to PayPal's own description. */
  get plainEnglish() {
    return PLAIN_ENGLISH[this.issue] ?? this.message;
  }
}

/** PayPal issues people are most likely to meet, explained without jargon. */
const PLAIN_ENGLISH: Record<string, string> = {
  RECEIVER_ACCOUNT_LOCKED: "Their PayPal account can't receive money right now, so it went straight back to you.",
  INSUFFICIENT_FUNDS: "PayPal couldn't pass the money on to them, so it went straight back to you.",
  PAYER_ACCOUNT_RESTRICTED: "Your PayPal account can't send money right now.",
  PAYER_CANNOT_PAY: "Your PayPal account can't pay for this right now.",
  AUTHORIZATION_EXPIRED: "PayPal's reservation expired before it was used.",
  AUTHORIZATION_VOIDED: "The reservation was already released.",
  PAYPAL_UNREACHABLE: "PayPal couldn't be reached. Try again in a moment.",
};
