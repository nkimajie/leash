import { ShoppingBag, UserRound } from "lucide-react";
import type { Decision, Product } from "@/schemas";
import { classNames } from "@/lib/format";

/** The product's photo from the store (via Channel3), or an icon when there is none. */
export function ProductPhoto({ decision, size = "md" }: { decision: Decision; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-[72px] w-[72px] rounded-xl" : "h-10 w-10 rounded-xl";
  const imageUrl = decision.product?.imageUrl;

  if (imageUrl) {
    return (
      // Photos come from many different stores, so a plain <img> is simpler than configuring next/image for each.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={classNames(box, "shrink-0 bg-white object-contain ring-1 ring-hairline")}
      />
    );
  }
  const Icon = decision.kind === "payment" ? UserRound : ShoppingBag;
  return (
    <span className={classNames(box, "grid shrink-0 place-items-center bg-paper text-ink-soft")}>
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
      className="text-xs text-leash"
    >
      View at {decision.counterparty}
    </a>
  );
}

/** A small product photo for search results, or a bag icon when there is none. */
export function ProductThumbnail({ imageUrl }: { imageUrl?: string }) {
  if (!imageUrl) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-ink-soft">
        <ShoppingBag className="h-4 w-4" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- same reason as ProductPhoto
    <img src={imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain ring-1 ring-hairline" />
  );
}

/** "Found with Channel3 · cheapest of 3 stores", or "Sample catalog" when Channel3 isn't set up. */
export function FoundWith({ product }: { product: Product | null }) {
  if (!product) return null;
  if (product.source !== "channel3") return <span className="text-xs text-ink-soft">Sample catalog</span>;
  const stores = product.storesCompared ?? 1;
  return (
    <span className="text-xs text-ink-soft">
      Found with Channel3{stores > 1 ? ` · cheapest of ${stores} stores` : ""}
    </span>
  );
}
