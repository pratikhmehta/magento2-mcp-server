import { ProductHandler } from '../handlers/product_handler.js';

export const definition = {
  name: "list_products",
  description: "Browse and search through your store's product catalog.",
  inputSchema: {
    type: "object",
    properties: {
      search: { type: "string", description: "Search for a product by name (e.g., 'Yoga Mat')." },
      category_id: { type: "string", description: "Only show products from a specific category ID." },
      limit: { type: "number", description: "How many products to show in the list (defaults to 10)." },
      sort_field: { type: "string", description: "How to sort the list (like by 'price' or 'name')." },
      sort_direction: { type: "string", description: "Sort 'ASC' for lowest to highest, or 'DESC' for highest to lowest." },
      store_code: { type: "string", description: "Optional store view code for localized data." }
    }
  }
};

export const handler = async (args) => {
  return await ProductHandler.list(args);
};
