import { ProductHandler } from '../handlers/product_handler.js';

export const definition = {
  name: "list_products",
  description: "Search and list products from the Magento catalog",
  inputSchema: {
    type: "object",
    properties: {
      search: { type: "string", description: "Search term for product name" },
      category_id: { type: "string", description: "Filter by Category ID" },
      limit: { type: "number", description: "Number of products to return (default 10)" }
    }
  }
};

export const handler = async (args) => {
  return await ProductHandler.list(args);
};
