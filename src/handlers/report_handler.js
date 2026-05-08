import { magento } from "../lib/magento.js";
import { cacheGet, cacheSet, TTL } from "../lib/cache.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reporting Handler
 * Generates CSV reports. Results are cached to avoid regenerating the same report.
 */
export const ReportHandler = {
  /**
   * Generates a CSV report of orders (cached)
   */
  async generateOrderReport(args) {
    const { status = "pending", days = 30 } = args;
    const cacheKey = `reports:orders:${status}:${days}`;

    const cached = cacheGet(cacheKey);
    if (cached) {
      console.error("[CACHE] Returning cached report");
      return cached;
    }

    // Calculate date range
    const date = new Date();
    date.setDate(date.getDate() - days);
    const fromDate = date.toISOString().split("T")[0];

    const searchCriteria =
      `searchCriteria[filter_groups][0][filters][0][field]=status&` +
      `searchCriteria[filter_groups][0][filters][0][value]=${status}&` +
      `searchCriteria[filter_groups][1][filters][0][field]=created_at&` +
      `searchCriteria[filter_groups][1][filters][0][value]=${fromDate}&` +
      `searchCriteria[filter_groups][1][filters][0][condition_type]=gt`;

    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      return await this._buildReport(response, status, days, cacheKey);
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  },

  /**
   * Builds CSV from order response data
   * @private
   */
  async _buildReport(response, status, days, cacheKey) {
    const orders = response.items || [];

    if (orders.length === 0) {
      return {
        message: `No orders found for status "${status}" in the last ${days} days.`,
      };
    }

    // Generate CSV Content
    const headers = [
      "Order #",
      "Date",
      "Status",
      "Customer",
      "Email",
      "Grand Total",
      "Currency",
    ];
    const rows = orders.map((o) => [
      o.increment_id,
      o.created_at,
      o.status,
      `${o.customer_firstname} ${o.customer_lastname}`,
      o.customer_email,
      o.grand_total,
      o.order_currency_code,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Save to file
    const fileName = `order_report_${status}_${Date.now()}.csv`;
    const reportsDir = path.join(__dirname, "../../reports");

    // Ensure reports directory exists
    await fs.mkdir(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, fileName);
    await fs.writeFile(filePath, csvContent);

    const result = {
      message: "Report generated successfully.",
      file_name: fileName,
      file_path: filePath,
      order_count: orders.length,
    };

    cacheSet(cacheKey, result, TTL.reports);
    return result;
  },
};
