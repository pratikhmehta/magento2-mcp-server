import { magento } from '../lib/magento.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reporting Handler
 */
export const ReportHandler = {
  /**
   * Generates a CSV report of orders
   */
  async generateOrderReport(args) {
    const { status = 'pending', days = 30 } = args;
    
    // Calculate date range
    const date = new Date();
    date.setDate(date.getDate() - days);
    const fromDate = date.toISOString().split('T')[0];

    const searchCriteria = `searchCriteria[filter_groups][0][filters][0][field]=status&` +
                           `searchCriteria[filter_groups][0][filters][0][value]=${status}&` +
                           `searchCriteria[filter_groups][1][filters][0][field]=created_at&` +
                           `searchCriteria[filter_groups][1][filters][0][value]=${fromDate}&` +
                           `searchCriteria[filter_groups][1][filters][0][condition_type]=gt`;
    
    try {
      const response = await magento.get(`/orders?${searchCriteria}`);
      const orders = response.items || [];

      if (orders.length === 0) {
        return { message: `No orders found for status "${status}" in the last ${days} days.` };
      }

      // Generate CSV Content
      const headers = ['Order #', 'Date', 'Status', 'Customer', 'Email', 'Grand Total', 'Currency'];
      const rows = orders.map(o => [
        o.increment_id,
        o.created_at,
        o.status,
        `${o.customer_firstname} ${o.customer_lastname}`,
        o.customer_email,
        o.grand_total,
        o.order_currency_code
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Save to file
      const fileName = `order_report_${status}_${Date.now()}.csv`;
      const reportsDir = path.join(__dirname, '../../reports');
      const filePath = path.join(reportsDir, fileName);

      fs.writeFileSync(filePath, csvContent);

      return {
        message: "Report generated successfully.",
        file_name: fileName,
        file_path: filePath,
        order_count: orders.length
      };
    } catch (error) {
      if (error.status === 404 && error.message.includes('store')) {
        // Fallback handled in magento.get or manually here if needed
        const fallback = await magento.get(`../all/V1/orders?${searchCriteria}`);
        // ... repeat CSV logic or refactor
      }
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }
};
