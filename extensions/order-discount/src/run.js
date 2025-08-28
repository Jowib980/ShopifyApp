// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/** @type {FunctionRunResult} */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

function safeParseJSON(s) {
  try {
    return JSON.parse(s ?? "[]");
  } catch (err) {
    console.error("Invalid JSON:", err);
    return [];
  }
}

function trimTrailingZeros(n) {
  // return string with up to 6 decimal places, trimmed
  const s = Number(n).toFixed(6);
  return s.replace(/\.?0+$/, "");
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const { cart, discountNode } = input;

  if (!cart?.lines?.length) return EMPTY_DISCOUNT;

  // 1) Prefer a single/global offers array passed via discountNode.metafield.value
  let offers = safeParseJSON(discountNode?.metafield?.value);

  // 2) Fallback: try to collect per-line product metafields (if available)
  if (!offers.length) {
    for (const line of cart.lines) {
      try {
        const productMf = line?.merchandise?.product?.metafield?.value;
        if (productMf) {
          const local = safeParseJSON(productMf);
          if (Array.isArray(local) && local.length) offers = offers.concat(local);
        }
      } catch (e) {
        // ignore parse errors per-line
      }
    }
  }

  if (!offers.length) return EMPTY_DISCOUNT;

  const discounts = [];

  for (const line of cart.lines) {
    if (line.merchandise?.__typename !== "ProductVariant") continue;

    const productGid = line.merchandise.product?.id; // expected gid://shopify/Product/...
    const qty = Number(line.quantity || 0);
    if (!productGid || qty <= 0) continue;

    // find all offers that target this product
    const matching = offers.filter((o) => {
      // allow different naming in JSON: productId or product_id, minQty / buy_quantity etc.
      const pid = o.productId ?? o.product_id;
      return pid === productGid;
    });

    if (!matching.length) continue;

    // For each matching offer compute effective percentage and pick the best
    let bestOfferResult = null;

    for (const o of matching) {
      const minQty = Number(o.minQty ?? o.min_qty ?? o.buy_quantity ?? 0);
      if (minQty <= 0 || qty < minQty) continue;

      const percentOff = Number(o.percentOff ?? o.percent_off ?? o.discount_percent ?? 0);
      const freeQty = Number(o.freeQty ?? o.free_quantity ?? o.free_qty ?? 0);

      // compute free items as groups of (minQty + freeQty)
      let freeItems = 0;
      if (freeQty > 0) {
        const groupSize = minQty + freeQty;
        if (groupSize > 0) {
          const groups = Math.floor(qty / groupSize);
          freeItems = groups * freeQty;
        }
      }

      // freePercentage applied across the whole line
      const freePercentage = freeItems > 0 ? (freeItems / qty) * 100 : 0;

      // choose the larger effective percentage for safety (don't stack by default)
      const effectivePercent = Math.max(percentOff, freePercentage);

      if (effectivePercent > 0 && (!bestOfferResult || effectivePercent > bestOfferResult.effectivePercent)) {
        bestOfferResult = {
          effectivePercent,
          percentOff,
          freePercentage,
          freeItems,
          minQty,
          rawOffer: o,
        };
      }
    }

    if (!bestOfferResult) continue;

    // Build a friendly message
    let message = "";
    if (bestOfferResult.freeItems > 0) {
      message = `Buy ${bestOfferResult.minQty} get ${bestOfferResult.rawOffer.freeQty ?? bestOfferResult.rawOffer.free_quantity ?? 1} free`;
    } else {
      message = `Buy ${bestOfferResult.minQty} get ${bestOfferResult.percentOff}% off`;
    }

    discounts.push({
      message,
      targets: [{ cartLine: { id: line.id } }],
      value: {
        percentage: {
          value: trimTrailingZeros(bestOfferResult.effectivePercent),
        },
      },
    });
  }

  if (!discounts.length) return EMPTY_DISCOUNT;

  return {
    // choose Maximum so for each line the best single discount applies.
    discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
    discounts,
  };
}
