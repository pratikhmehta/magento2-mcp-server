import { MCPServer } from './src/lib/mcp.js';

/**
 * Main Application Entry Point
 * Bootstraps and starts the Magento MCP server
 */
async function bootstrap() {
  const server = new MCPServer();
  
  try {
    await server.start();
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.error("\n🛑 Shutting down Magento MCP Server...");
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error("❌ Failed to start Magento MCP Server:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
