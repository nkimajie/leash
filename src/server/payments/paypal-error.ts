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
}
