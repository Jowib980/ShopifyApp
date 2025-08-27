// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const { cart } = input;

  // Parse the discount configuration from the metafield
  let offers = [];
  try {
    offers = JSON.parse(input?.discountNode?.metafield?.value ?? "[]");
  } catch (err) {
    console.error("Invalid discount metafield JSON:", err);
    return EMPTY_DISCOUNT;
  }

  if (!Array.isArray(offers) || offers.length === 0) return EMPTY_DISCOUNT;

  const discounts = [];

  for (const line of cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;

    const productGid = line.merchandise.product.id;
    const qty = Number(line.quantity);

    // Find if this line matches any offer
    const offer = offers.find((o) => o.productId === productGid);

    if (offer && qty >= offer.minQty) {
      discounts.push({
        message: `Buy ${offer.minQty} get ${offer.percentOff}% off`,
        targets: [{ cartLine: { id: line.id } }],
        value: {
          percentage: {
            value: String(offer.percentOff),
          },
        },
      });
    }
  }

  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.Maximum,
    discounts,
  };
}
