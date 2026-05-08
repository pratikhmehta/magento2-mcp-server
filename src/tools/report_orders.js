import { ReportHandler } from '../handlers/report_handler.js';

export const definition = {
  name: "generate_order_report",
  description: "Create a downloadable Excel-ready report of your orders to review offline.",
  inputSchema: {
    type: "object",
    properties: {
      status: { 
        type: "string", 
        description: "Which type of orders to include (e.g., 'pending' or 'complete')." 
      },
      days: { 
        type: "number", 
        description: "How many days of history to include (defaults to 30 days)." 
      }
    }
  }
};

export const handler = async (args) => {
  return await ReportHandler.generateOrderReport(args);
};
