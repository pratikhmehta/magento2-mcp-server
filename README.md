# Magento 2 MCP Server

A production-ready **Model Context Protocol (MCP)** server that connects AI Agents (Cursor, Windsurf, Claude, etc.) directly to your Magento 2 store. Empower your AI assistant to manage inventory, check orders, and provide context-aware customer support.

## 🚀 Key Features

- **📦 Inventory Management**: Monitor stock levels with SKU glob filtering and low-stock alerts.
- **🛒 Order Intelligence**: Fetch detailed order data by ID, list recent orders, and track status history.
- **🤖 AI Customer Service**: Integrated handler for LLM-powered customer chat with full Magento order context.
- **⚡ Order Automation**: Handle lifecycle events (Paid, Shipped, Cancelled) with automated status transitions.
- **🛡️ Production Ready**: Includes rate limiting, resilient retries (503 handling), and structured logging.
- **🌐 Agent Friendly**: Pre-configured with `.cursorrules` and `.windsurfrules` for zero-friction integration with AI IDEs.

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

## 🔌 Integrating with AI Agents

### Cursor / Windsurf
This repository includes pre-configured rules in `.cursorrules` and `.windsurfrules`. Simply open the project folder in your IDE, and the agent will automatically recognize its authorized tools.

### Claude Desktop
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "magento-mcp": {
      "command": "node",
      "args": ["/path/to/magento2-mcp-server/index.js"],
      "env": {
        "MAGENTO_BASE_URL": "https://your-store.com/rest/V1",
        "MAGENTO_TOKEN": "your-access-token",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

## 🛡️ Safety & Permissions
This server implements a **read-only default** for sensitive operations. Any write operations (like updating order status) require explicit confirmation unless configured otherwise via the provided rule hooks.

## 📄 License
MIT © Magento MCP Server Contributors
