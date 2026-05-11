# Magento 2 MCP Server

A production-ready **Model Context Protocol (MCP)** server that connects AI Agents (Cursor, Windsurf, Claude, etc.) directly to your Magento 2 store. Empower your AI assistant to manage inventory, check orders, and provide context-aware customer support.

## 🚀 Key Features

- **📦 Inventory Management**: Monitor stock levels across all **Multi-Source Inventory (MSI)** locations with warehouse-specific tracking.
- **🌍 Multi-Store & Localization**: Fetch product data, prices, and configurations translated for any specific store view (language).
- **🛒 Order Intelligence**: Fetch detailed order data by ID, list recent orders, and track status history with store-specific headers.
- **⚡ Order Automation**: Handle lifecycle events (Paid, Shipped, Cancelled) with automated status transitions.
- **🛡️ Production Ready**: Includes rate limiting, resilient retries (503 handling), strict Zod input validation, and background memory garbage collection.
- **📜 Audit Trail**: All automated actions are securely logged to a structured JSON file (`automated-actions.log`) with PII sanitized.
- **🌐 Agent Friendly**: Pre-configured with `.cursorrules` and `.windsurfrules` for zero-friction integration with AI IDEs.
- **📖 Comprehensive Docs**: Detailed [API Reference](API.md) for all available tools.

## 🛠️ Setup & Installation

### 1. Prerequisites

- **Node.js 20+** (Required for modern MCP features)
- **Magento 2 Store** with REST API access (Integrations Token)
- **LLM API Key** (e.g., Google Gemini) for AI chat features

### 2. Configuration

Copy the environment template and fill in your store details:

```bash
cp .env.example .env
# Edit .env with your MAGENTO_BASE_URL and MAGENTO_TOKEN
```

### 3. Installation

```bash
npm install
```

### 4. Connectivity Check

Verify your Magento connection before starting the server:

```bash
npm run smoke
```

### 5. Running the Server

```bash
npm start
```

## 💬 How to Use (Examples)

Once the server is running and connected to your AI Agent (Cursor, Claude, etc.), you can simply ask questions in plain English. The AI will translate your request into Magento API calls.

### 📦 Inventory & Stock

- _"Check for any low stock items in the 'SHIRT' category."_
- _"Show me the inventory levels for SKU 'BAG-001' across all warehouses."_
- _"Alert me if any products have less than 5 units left."_

### 🌍 Multi-Store & Languages

- _"Get the Mongolian description for SKU '481022-MASH' from store 'mn_mn'."_
- _"List all store views and their associated websites."_
- _"What is the base currency for the European store view?"_

### 🏷️ Product Catalog

- _"Show me the price and description for SKU 'WSH12-M-Blue'."_
- _"List all products that have 'Yoga' in the name."_
- _"Find the products in Category 15."_

### 📊 Business Reporting

- _"Generate an Excel report of all completed orders from the last 7 days."_
- _"Create a CSV of all pending orders for this month."_

### 🛒 Order Management

- _"Give me the full details for order #211000000293."_
- _"What are the last 5 pending orders?"_
- _"Find all orders placed by customer customer@example.com."_

### 🤖 AI Customer Support

- _"Ask the AI assistant: 'What is the return policy for my last order?' for customer email example@gmail.com."_

## 🔌 Usage & Integration

There are three ways to use these Magento tools depending on your workflow:

### Option 1: Web Dashboard (No AI Client Required) 🌐

The easiest way to get a visual interface for managing your store without using specialized AI software.

1. Install dependencies: `npm install`
2. Start the interactive dashboard:
   ```bash
   npx @modelcontextprotocol/inspector node index.js
   ```
3. Open the provided link (usually `http://localhost:3000`) in your browser to see a professional UI for all tools.

### Option 2: AI Agents (Cursor, Windsurf, Claude) 🤖

#### Cursor / Windsurf

Simply open this project folder in your IDE. The agent will automatically recognize the tools via the included `.cursorrules` or `.windsurfrules`.

#### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "magento-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/magento2-mcp-server/index.js"],
      "env": {
        "MAGENTO_BASE_URL": "https://your-store.com/rest/V1",
        "MAGENTO_TOKEN": "your-access-token",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

### Option 3: Command Line (CLI) 💻

For quick terminal access without a GUI:

```bash
npx mcp-cli index.js
```

You can then run commands like `list_products` or `generate_order_report` directly.

### Option 4: Remote Server / PM2 (SSE Transport) 🌍

If you want to run the MCP server as a 24/7 background service on a remote VPS and connect to it over HTTP (Server-Sent Events):

1. Start the daemon using the provided ecosystem config:
   ```bash
   npx pm2 start ecosystem.config.cjs
   ```
2. The server will run in the background, automatically restart on crashes, and listen for SSE connections on `http://localhost:3000/sse`.
3. You can monitor live logs using `npx pm2 logs magento2-mcp-server`.

_Note: AI Clients must support SSE to connect via this method. For remote Claude/Cursor connections, using Stdio over SSH is recommended._

## 🛡️ Safety & Permissions

This server is designed for **permission-free automation** in production environments. AI agents execute commands autonomously without prompting end users.

To ensure absolute safety, it utilizes:

1. **Strict Zod schemas** for input validation (rejecting AI hallucinations).
2. Robust **circuit breakers (rate limits)** to prevent API flooding.
3. A fully sanitized **JSON audit log** to securely record all write operations.

## 📄 License

MIT © Magento MCP Server Contributors
