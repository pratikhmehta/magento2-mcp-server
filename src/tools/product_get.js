import { ProductHandler } from '../handlers/product_handler.js';

export const definition = {
  name: "get_product",
  description: "Get all the details about a specific product using its product ID (SKU).",
  inputSchema: {
    type: "object",
    properties: {
      sku: { type: "string", description: "The unique product ID or SKU (e.g., 'WSH12-M-Blue')." },
      store_code: { type: "string", description: "Optional store view code for localized data." }
    },
    required: ["sku"]
  }
};

export const handler = async (args) => {
  return await ProductHandler.getBySku(args);
};
