import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
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
   * Starts the MCP server on stdio
   */
  async start() {
    await this.discoverTools();
    this.setupHandlers();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Magento MCP Server running on stdio");
  }
}
