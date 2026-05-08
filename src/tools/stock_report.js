import { magento } from "../lib/magento.js";
import { z } from "zod";
import { logger } from "../../logger.js";

export const definition = {
  name: "generate_store_stock_report",
  description:
    "Generate a report of product availability and counts across different store websites.",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description:
          "Number of products to sample for the report (default 100)",
        default: 100,
      },
      page: {
        type: "number",
        description: "Page number for pagination (default 1)",
        default: 1,
      },
    },
  },
};

const stockReportSchema = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(1000, "Maximum allowed limit is 1000")
    .optional()
    .default(100),
  page: z.number().int().positive().optional().default(1),
});

export const handler = async (args) => {
  const result = stockReportSchema.safeParse(args || {});

  if (!result.success) {
    logger.warn("TOOL_VALIDATION_FAILED", {
      tool: "generate_store_stock_report",
      issues: result.error.issues,
    });
    return {
      success: false,
      error: "Input validation failed. Please check your arguments.",
      details: result.error.issues,
    };
  }

  const { limit, page } = result.data;
  logger.info("TOOL_EXECUTION_STARTED", {
    tool: "generate_store_stock_report",
    limit,
    page,
  });

  try {
    // 1. Fetch stores to map website IDs
    const stores = await magento.get("/store/storeViews");
    const websiteMap = {};
    stores.forEach((s) => {
      if (!websiteMap[s.website_id]) {
        websiteMap[s.website_id] = { name: s.name, code: s.code, count: 0 };
      }
    });

    // 2. Fetch products sample
    const response = await magento.get(
      `/products?searchCriteria[pageSize]=${limit}&searchCriteria[currentPage]=${page}`,
    );
    const products = response.items || [];

    let stockAccessible = false;

    products.forEach((p) => {
      const wids =
        (p.extension_attributes && p.extension_attributes.website_ids) || [];
      wids.forEach((wid) => {
        if (websiteMap[wid]) {
          websiteMap[wid].count++;
        }
      });

      // Check if stock is actually present
      if (
        p.extension_attributes &&
        p.extension_attributes.stock_item &&
        p.extension_attributes.stock_item.qty > 0
      ) {
        stockAccessible = true;
      }
    });

    logger.info("TOOL_EXECUTION_SUCCESS", {
      tool: "generate_store_stock_report",
      sample_size: products.length,
    });
    return {
      total_products_in_catalog: response.total_count,
      current_page: page,
      page_size: limit,
      total_pages: Math.ceil(response.total_count / limit),
      sample_size: products.length,
      stock_data_status: stockAccessible
        ? "Accessible"
        : "Restricted (MSI likely active, numeric quantities hidden)",
      store_distribution: Object.keys(websiteMap)
        .map((wid) => ({
          website_id: wid,
          store_name: websiteMap[wid].name,
          store_code: websiteMap[wid].code,
          products_available_percent: Math.round(
            (websiteMap[wid].count / products.length) * 100,
          ),
        }))
        .filter((s) => s.products_available_percent > 0)
        .sort(
          (a, b) => b.products_available_percent - a.products_available_percent,
        ),
      recommendation: stockAccessible
        ? "Report generated successfully."
        : "Grant 'Magento_InventoryApi::source_item_read' permission for exact numeric stock levels.",
    };
  } catch (error) {
    logger.error("TOOL_EXECUTION_ERROR", {
      tool: "generate_store_stock_report",
      error: error.message,
    });
    throw new Error(`Failed to generate stock report: ${error.message}`);
  }
};
