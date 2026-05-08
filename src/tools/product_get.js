import { ProductHandler } from '../handlers/product_handler.js';

export const definition = {
  name: "get_product",
  description: "Fetch detailed information for a specific product using its SKU",
  inputSchema: {
    type: "object",
    properties: {
      sku: { type: "string", description: "The product SKU (Unique Identifier)" }
    },
    required: ["sku"]
  }
};

export const handler = async (args) => {
  return await ProductHandler.getBySku(args);
};
