import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * MCP Server Bootstrap
 * Automatically loads tools from src/tools/*.js
 * Exposes Resources for permission-free data access
 */
export class MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "magento2-mcp-server",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
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
    console.error(`[TOOLS] Discovered ${this.tools.size} tools`);
  }

  /**
   * Initializes MCP Tool handlers
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
   * Initializes MCP Resource handlers for permission-free data access
   */
  setupResourceHandlers() {
    // Single handler for listing all resources and templates
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "magento://orders/recent",
          name: "Recent Orders",
          description: "Latest 10 orders with status and totals.",
          mimeType: "application/json"
        },
        {
          uri: "magento://inventory/alerts",
          name: "Low Stock Alerts",
          description: "Products running low on stock.",
          mimeType: "application/json"
        },
        {
          uri: "magento://sales/monthly-summary",
          name: "Monthly Sales",
          description: "Aggregated sales data for the current month.",
          mimeType: "application/json"
        }
      ]
    }));

    // Resource templates for dynamic lookups
    try {
      this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
        resourceTemplates: [
          {
            uriTemplate: "magento://orders/{increment_id}",
            name: "Order Details",
            description: "Full details for a specific order number.",
            mimeType: "application/json"
          },
          {
            uriTemplate: "magento://products/{sku}",
            name: "Product Details",
            description: "Full catalog info for a specific product SKU.",
            mimeType: "application/json"
          }
        ]
      }));
    } catch (e) {
      // ListResourceTemplatesRequestSchema may not exist in older SDK versions
      console.error('[WARNING] Resource templates not supported by SDK version, skipping.');
    }

    // Read a specific resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      const { OrderAutomationHandler } = await import('../handlers/order_automation_handler.js');
      const { InventoryAlertHandler } = await import('../handlers/inventory_alerts_handler.js');
      const { ProductHandler } = await import('../handlers/product_handler.js');

      let data;

      // Static resources first (exact match)
      if (uri === "magento://orders/recent") {
        data = await OrderAutomationHandler.listRecent({ limit: 10 });
      }
      else if (uri === "magento://inventory/alerts") {
        data = await InventoryAlertHandler.checkAlerts({ threshold: 10 });
      }
      else if (uri === "magento://sales/monthly-summary") {
        data = await OrderAutomationHandler.getMonthlySummary();
      }
      // Dynamic templates (prefix match)
      else if (uri.startsWith("magento://orders/")) {
        const increment_id = uri.replace("magento://orders/", "");
        data = await OrderAutomationHandler.getByIncrementId({ increment_id });
      }
      else if (uri.startsWith("magento://products/")) {
        const sku = uri.replace("magento://products/", "");
        data = await ProductHandler.getBySku({ sku });
      }
      else {
        throw new Error(`Resource not found: ${uri}`);
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
    console.error("SUCCESS: Magento MCP Server v1.1.0 running on stdio");
  }
}
