import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * MCP Server Bootstrap
 * Automatically loads tools from src/tools/*.js
 */
export class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "magento2-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {
            subscribe: true,
            templates: true
          },
        },
      }
    );
    this.tools = new Map();
  }

  /**
   * Automatically discovers and registers tools
   */
  async discoverTools() {
    const toolsDir = path.join(__dirname, '../tools');
    const toolFiles = await glob(`${toolsDir}/*.js`);

    for (const file of toolFiles) {
      const toolModule = await import(`file://${file}`);
      if (toolModule.definition && toolModule.handler) {
        this.tools.set(toolModule.definition.name, toolModule);
      }
    }
  }

  /**
   * Initializes MCP request handlers
   */
  setupHandlers() {
    // Handler for listing tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map(t => t.definition),
    }));

    // Handler for calling tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await tool.handler(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: error.message }],
        };
      }
    });
  }

  /**
   * Initializes MCP Resource handlers
   */
  setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "magento://orders/recent",
          name: "Recent Orders Summary",
          description: "A summary of the last 10 orders including status and totals.",
          mimeType: "application/json"
        },
        {
          uri: "magento://inventory/alerts",
          name: "Low Stock Inventory",
          description: "Current products that are running low on stock.",
          mimeType: "application/json"
        },
        {
          uri: "magento://sales/monthly-summary",
          name: "Monthly Sales Report",
          description: "Aggregated sales data for the current month.",
          mimeType: "application/json"
        }
      ]
    }));

    // List available resource templates
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "magento://orders/recent",
          name: "Recent Orders Summary",
          description: "A summary of the last 10 orders including status and totals.",
          mimeType: "application/json"
        },
        {
          uri: "magento://inventory/alerts",
          name: "Low Stock Inventory",
          description: "Current products that are running low on stock.",
          mimeType: "application/json"
        },
        {
          uri: "magento://sales/monthly-summary",
          name: "Monthly Sales Report",
          description: "Aggregated sales data for the current month.",
          mimeType: "application/json"
        }
      ],
      resourceTemplates: [
        {
          uriTemplate: "magento://orders/{increment_id}",
          name: "Order Details",
          description: "Full details and history for a specific order number.",
          mimeType: "application/json"
        },
        {
          uriTemplate: "magento://products/{sku}",
          name: "Product Details",
          description: "Full catalog information for a specific product SKU.",
          mimeType: "application/json"
        }
      ]
    }));

    // Read a specific resource or template
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      const { OrderAutomationHandler } = await import('../handlers/order_automation_handler.js');
      const { InventoryAlertHandler } = await import('../handlers/inventory_alerts_handler.js');
      const { ProductHandler } = await import('../handlers/product_handler.js');

      let data;

      // Handle Templates (using simple regex/string matching for demo)
      if (uri.startsWith("magento://orders/")) {
        const increment_id = uri.replace("magento://orders/", "");
        data = await OrderAutomationHandler.getByIncrementId({ increment_id });
      } 
      else if (uri.startsWith("magento://products/")) {
        const sku = uri.replace("magento://products/", "");
        data = await ProductHandler.get({ sku });
      }
      else {
        switch (uri) {
          case "magento://orders/recent":
            data = await OrderAutomationHandler.listRecent({ limit: 10 });
            break;
          case "magento://inventory/alerts":
            data = await InventoryAlertHandler.checkAlerts({ threshold: 10 });
            break;
          case "magento://sales/monthly-summary":
            const orders = await OrderAutomationHandler.listRecent({ limit: 100 }); 
            data = { total_orders: orders.total_count || 0, status: "active" };
            break;
          default:
            throw new Error(`Resource not found: ${uri}`);
        }
      }

      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2)
        }]
      };
    });
  }

  /**
   * Starts the MCP server on stdio
   */
  async start() {
    await this.discoverTools();
    this.setupHandlers();
    this.setupResourceHandlers();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Magento MCP Server running on stdio");
  }
}
