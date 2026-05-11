import { StoreHandler } from '../handlers/store_handler.js';

export const definition = {
  name: "list_categories",
  description: "Browse the Magento category tree to find category IDs and structure.",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

export async function handler(args) {
  return await StoreHandler.listCategories();
}
