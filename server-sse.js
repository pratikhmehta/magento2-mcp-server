import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { MCPServer } from "./src/lib/mcp.js";
import { config } from "./src/config.js";

const app = express();
const mcp = new MCPServer();

let transport;

// Health check endpoint for Docker/PM2
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await mcp.server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(500).send("SSE transport not active");
  }
});

async function start() {
  // Initialize tools without triggering the Stdio transport
  await mcp.discoverTools();
  mcp.setupHandlers();
  mcp.setupResourceHandlers();

  const port = config.PORT || 3000;

  app.listen(port, () => {
    console.error(
      `[PM2] Magento MCP Server running on SSE at http://localhost:${port}/sse`,
    );
  });
}

start();
