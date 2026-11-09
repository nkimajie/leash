import "server-only";

// Real product search through Channel3 (https://channel3.ai), a catalog of products from
// many online stores. We turn each result into our own Product shape, priced at the
// cheapest store that has it in stock.

import type { Product } from "@/schemas";
import { channel3ApiKey } from "@/server/config/environment";

const SEARCH_URL = "https://api.trychannel3.com/v1/search";

/** The parts of Channel3's response we use. */
type Channel3Product = {
  id: string;
  title: string;
  category: { title: string } | null;
  images: { url: string; cleaned_url: string | null; is_main_image: boolean }[];
  offers: {
    domain: string;
    url: string;
    price: { price: number; currency: string };
    availability: "InStock" | "OutOfStock";
  }[];
};

export async function searchChannel3(query: string, options: { maxPrice?: number; limit: number }): Promise<Product[]> {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "x-api-key": channel3ApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: options.limit,
      filters: {
        availability: ["InStock"],
        ...(options.maxPrice ? { price: { max_price: options.maxPrice } } : {}),
      },
      config: { currency: "USD", country: "US" },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Channel3 search failed with HTTP ${response.status}`);

  const { products } = (await response.json()) as { products: Channel3Product[] };
  return products.map(toProduct).filter((product): product is Product => product !== null);
}

function toProduct(item: Channel3Product): Product | null {
  const inStock = item.offers.filter((offer) => offer.availability === "InStock");
  const cheapestOffer = inStock.sort((a, b) => a.price.price - b.price.price)[0];
  if (!cheapestOffer) return null;

  const image = item.images.find((i) => i.is_main_image) ?? item.images[0];
  return {
    id: item.id,
    title: item.title,
    price: cheapestOffer.price.price,
    currency: cheapestOffer.price.currency,
    merchant: cheapestOffer.domain,
    category: item.category?.title.toLowerCase() ?? "other",
    url: cheapestOffer.url,
    imageUrl: image?.cleaned_url ?? image?.url,
    source: "channel3",
    storesCompared: inStock.length,
  };
}
