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
  PAYEE_ACCOUNT_INVALID: "That email isn't a PayPal account, so the money had nowhere to go.",
  PAYEE_ACCOUNT_RESTRICTED: "The person's PayPal account can't receive money right now.",
  PAYEE_NOT_CONSENTED: "PayPal needs the person to accept payments from this app first.",
  PAYER_ACCOUNT_RESTRICTED: "Your PayPal account can't send money right now.",
  PAYER_CANNOT_PAY: "Your PayPal account can't pay for this right now.",
  AUTHORIZATION_EXPIRED: "PayPal's reservation expired before it was used.",
  AUTHORIZATION_VOIDED: "The reservation was already released.",
  PAYPAL_UNREACHABLE: "PayPal couldn't be reached. Try again in a moment.",
};
