/** Which outside services run for real and which run in mock mode (no keys set). */
export type ServiceModes = {
  payments: "paypal-sandbox" | "mock";
  assistant: "claude" | "mock";
  productSearch: "channel3" | "mock";
  database: "supabase" | "memory";
  forceDeclinedPayments: boolean;
};
