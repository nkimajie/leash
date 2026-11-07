import { ShoppingBag, UserRound } from "lucide-react";
import type { Decision } from "@/schemas";
import { classNames } from "@/lib/format";

/** The product's photo from the store (via Channel3), or an icon when there is none. */
export function ProductPhoto({ decision, size = "md" }: { decision: Decision; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-10 w-10 rounded-xl";
  const imageUrl = decision.product?.imageUrl;

  if (imageUrl) {
    return (
      // Photos come from many different stores, so a plain <img> is simpler than configuring next/image for each.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={classNames(box, "shrink-0 bg-white object-contain ring-1 ring-stone-200")}
      />
    );
  }
  const Icon = decision.kind === "payment" ? UserRound : ShoppingBag;
  return (
    <span className={classNames(box, "grid shrink-0 place-items-center bg-stone-100 text-stone-600")}>
      <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
    </span>
  );
}

/** "View at kitchendepot.com", when the product has a store link. */
export function StoreLink({ decision }: { decision: Decision }) {
  const url = decision.product?.url;
  if (!url || url.includes("example.com")) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800"
    >
      View at {decision.counterparty}
    </a>
  );
}
