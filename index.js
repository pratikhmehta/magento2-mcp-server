import { MCPServer } from "./src/lib/mcp.js";
import http from "http";

/**
 * Main Application Entry Point
 * Bootstraps and starts the Magento MCP server
 */
async function bootstrap() {
  const server = new MCPServer();

  try {
    await server.start();

    // Start a lightweight HTTP server specifically for Docker Health Checks
    // This verifies the Node.js event loop is not blocked/hung.
    const healthPort = process.env.HEALTH_PORT || 3001;
    const healthServer = http
      .createServer((req, res) => {
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
        } else {
          res.writeHead(404);
          res.end();
        }
      })
      .listen(healthPort);

    // Handle graceful shutdown
    const shutdown = async () => {
      console.error("\n[STOP] Shutting down Magento MCP Server...");
      healthServer.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("[ERROR] Failed to start Magento MCP Server:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
