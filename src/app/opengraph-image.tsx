// The preview image shown when a link to Leash is shared (Devpost, Slack, social media).
// Generated once at build time by Next.js.

import { ImageResponse } from "next/og";

export const alt = "Leash: an AI assistant that pays with your PayPal, only inside rules you set";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#f7f5f0", // paper
        color: "#14130f", // ink
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="96" height="96" viewBox="0 0 36 36">
          <rect width="36" height="36" rx="10.8" fill="#1552F0" />
          <path
            d="M13.5 18.45c-7.2 0-7.2-10.8 0-10.8s7.2 10.8 0 10.8Zm0 0v5.4a3.6 3.6 0 0 0 3.6 3.6h9"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.97"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -2 }}>Leash</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: -1.5,
          }}
        >
          <span style={{ marginRight: 16 }}>Your errands. Your rules.</span>
          <span style={{ color: "#1552f0" }}>You hold the leash.</span>
        </div>
        <div style={{ fontSize: 32, color: "#6b675e" }}>
          Claude shops and pays with your PayPal. Anything outside your rules is reserved, not taken, until you say yes.
        </div>
      </div>
    </div>,
    size,
  );
}
