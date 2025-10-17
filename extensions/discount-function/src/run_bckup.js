// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

function safeParseJSON(s) {
  try {
    return JSON.parse(s ?? "[]");
  } catch {
    return [];
  }
}

function trimTrailingZeros(n) {
  const s = Number(n).toFixed(6);
  return s.replace(/\.?0+$/, "");
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const { cart, discountNode } = input;

  const discounts = [];

  // fallback target to avoid "targets can't be blank"
  const fallbackTarget =
    cart?.lines?.length && cart.lines[0].merchandise?.__typename === "ProductVariant"
      ? [{ productVariant: { id: cart.lines[0].merchandise.id } }]
      : [{ cartLine: { id: cart?.lines?.[0]?.id || "gid://shopify/CartLine/0" } }];

  if (!cart) {
    return {
      discountApplicationStrategy: DiscountApplicationStrategy.All,
      discounts: [
        {
          targets: fallbackTarget,
          value: { percentage: { value: "0" } },
        },
      ],
    };
  }

  // Parse any global offers from discountNode metafield
  let globalOffers = [];
  if (discountNode?.metafield?.value) {
    globalOffers = safeParseJSON(discountNode.metafield.value);
  }

  // Process each cart line separately
  for (const line of cart.lines) {
    const variant = line.merchandise;
    const qty = Number(line.quantity || 0);

    if (!variant || qty <= 0) continue;

    const variantId = variant.id;
    const productId = variant.product?.id || null;

    let localOffers = [];
    const variantMfValue = variant.metafield?.value;
    const productMfValue = variant.product?.metafield?.value;

    if (variantMfValue) {
      localOffers = safeParseJSON(variantMfValue);
    } else if (productMfValue) {
      localOffers = safeParseJSON(productMfValue);
    }

    const offers = (Array.isArray(globalOffers) ? globalOffers : []).concat(
      Array.isArray(localOffers) ? localOffers : []
    );

    if (!offers.length) {
      discounts.push({
        targets: [{ productVariant: { id: variantId } }],
        value: { percentage: { value: "0" } },
      });
      continue;
    }

    const matching = offers.filter((o) => {
      const pid = o.productId ?? o.product_id ?? null;
      if (!pid) return true;
      const cleanPid = pid.replace(/\\/g, "");
      return cleanPid === variantId || (productId && cleanPid === productId);
    });

    if (!matching.length) {
      discounts.push({
        targets: [{ productVariant: { id: variantId } }],
        value: { percentage: { value: "0" } },
      });
      continue;
    }

    let best = null;
    for (const o of matching) {
      const minQty = Number(o.minQty ?? o.min_qty ?? o.buy_quantity ?? 0);
      if (minQty <= 0 || qty < minQty) continue;

      const percentOff = Number(o.percentOff ?? o.percent_off ?? o.discount_percent ?? 0);
      const freeQty = Number(o.freeQty ?? o.free_quantity ?? o.free_qty ?? 0);
      const amountOff = Number(o.fixedAmountOff ?? o.fixed_amount_off ?? o.amount_off ?? 0);

      // calculate free items percentage
      let freeItems = 0;
      if (freeQty > 0) {
        const group = minQty + freeQty;
        if (group > 0) {
          const groups = Math.floor(qty / group);
          freeItems = groups * freeQty;
        }
      }
      const freePercentage = freeItems > 0 ? (freeItems / qty) * 100 : 0;

      if (amountOff > 0) {
        // Prefer amount_off as a fixed discount
        best = {
          type: "amount",
          minQty,
          amountOff,
          rawOffer: o,
        };
      } else {
        // fallback to percentage/free
        const effectivePercent = Math.max(percentOff, freePercentage);
        if (effectivePercent > 0 && (!best || effectivePercent > best.effectivePercent)) {
          best = {
            type: "percentage",
            effectivePercent,
            percentOff,
            freeItems,
            minQty,
            rawOffer: o,
          };
        }
      }
    }

    if (!best) {
      discounts.push({
        targets: [{ productVariant: { id: variantId } }],
        value: { percentage: { value: "0" } },
      });
      continue;
    }

    let discountObj;
    if (best.type === "amount") {
      discountObj = {
        // message: `Buy ${best.minQty} get ${best.amountOff}rs off`,
        targets: [{ cartLine: { id: line.id } }], // must apply to line, not variant
        value: { fixedAmount: { amount: trimTrailingZeros(best.amountOff) } },
      };
    } else {
      const message =
        best.freeItems > 0
          ? `Buy ${best.minQty} get ${best.rawOffer.freeQty ?? best.rawOffer.free_quantity ?? 0} free`
          : `Buy ${best.minQty} get ${best.percentOff}% off`;

      discountObj = {
        // message: `Offer: ${message}`,
        targets: [{ productVariant: { id: variantId } }],
        value: { percentage: { value: trimTrailingZeros(best.effectivePercent) } },
      };
    }

    discounts.push(discountObj);
  }

  if (!discounts.length) {
    discounts.push({
      targets: fallbackTarget,
      value: { percentage: { value: "0" } },
    });
  }

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts,
  };
}
