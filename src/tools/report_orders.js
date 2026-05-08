import { ReportHandler } from '../handlers/report_handler.js';

export const definition = {
  name: "generate_order_report",
  description: "Generate a CSV report (compatible with Excel) of orders based on status and date range",
  inputSchema: {
    type: "object",
    properties: {
      status: { 
        type: "string", 
        description: "Order status to include (e.g., 'pending', 'complete', 'processing')" 
      },
      days: { 
        type: "number", 
        description: "Number of days to look back (default 30)" 
      }
    }
  }
};

export const handler = async (args) => {
  return await ReportHandler.generateOrderReport(args);
};
