// Shared types. Field names on Decision match the columns in supabase/schema.sql.

export type Rules = {
  currency: string; // e.g. "USD"
  goalBudget: number; // default total spend per goal (a goal like "under $60" overrides it)
  maxItemPrice: number; // hard limit: anything above is blocked
  dailyCap: number; // hard limit on everything spent today
  weeklyCap: number; // hard limit on everything spent in the last 7 days
  autoApproveLimit: number; // at or below this, the agent may buy without asking
  allowedCategories: string[]; // empty list = every category allowed
  blockedCategories: string[];
  allowedMerchants: string[]; // empty list = every merchant allowed
  blockedMerchants: string[];
};

export type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  merchant: string;
  category: string;
  url?: string;
  imageUrl?: string;
  description?: string;
};

// What has already been committed (captured, approved or held) when checking a new item.
export type SpendContext = {
  goalBudget: number;
  goalSpent: number;
  spentToday: number;
  spentThisWeek: number;
};

export type PolicyVerdict = "auto_approve" | "needs_approval" | "blocked";

export type PolicyResult = {
  verdict: PolicyVerdict;
  rule_hit: string;
  explanation: string;
};

export type Verdict =
  | "auto_captured" // within rules, PayPal authorized and captured
  | "held" // authorized, waiting for a human
  | "approved" // human approved, captured
  | "denied" // blocked by the rules, PayPal never called
  | "voided" // human denied, authorization voided
  | "refunded"
  | "failed"; // PayPal returned an error (e.g. INSTRUMENT_DECLINED)

export type Decision = {
  id: string;
  goal_id: string;
  product: Product;
  price: number;
  currency: string;
  merchant: string;
  verdict: Verdict;
  rule_hit: string;
  ai_reasoning: string;
  paypal_order_id: string | null;
  paypal_auth_id: string | null;
  paypal_capture_id: string | null;
  paypal_status: string | null;
  paypal_debug_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  prompt: string;
  budget: number;
  status: "running" | "done" | "failed";
  created_at: string;
};
