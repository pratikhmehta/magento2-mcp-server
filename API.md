# Magento 2 MCP Server API Reference

This document provides a detailed reference for the tools available in the Magento 2 MCP Server.

## 📦 Inventory Tools

### `check_inventory_alerts`
Monitors and filters low-stock items across Magento inventory sources.

**Parameters:**
- `sku_filter` (string, optional): A glob pattern to filter by SKU (e.g. `SHIRT-*`).
- `threshold` (number, optional): Quantity threshold for low stock alerts. Default is `10`.

**Example Usage:**
> "Check for any items with the SKU 'BAG-*' that have less than 5 units in stock."

---

## 📦 Product Tools

### `get_product`
Fetch detailed information for a specific product using its SKU.

**Parameters:**
- `sku` (string, required): The product SKU (Unique Identifier).

**Example Usage:**
> "Show me the price and description for SKU 'WSH12-M-Blue'."

### `list_products`
Search and list products from the Magento catalog.

**Parameters:**
- `search` (string, optional): Search term for product name.
- `category_id` (string, optional): Filter by Category ID.
- `limit` (number, optional): Number of products to return. Default is `10`.

**Example Usage:**
> "List all products in category 15 that have 'Yoga' in the name."

---

## 🛒 Order Tools

### `get_order`
Fetches detailed data for a specific Magento order by its Increment ID.

**Parameters:**
- `increment_id` (string, required): The Magento Order Increment ID (e.g. `211000000293`).

**Example Usage:**
> "Give me the full details for order #211000000293."

### `list_recent_orders`
Fetches a list of recent orders from Magento with optional status filtering.

**Parameters:**
- `status` (string, optional): Filter by order status (e.g., `pending`, `processing`, `complete`, `closed`).
- `limit` (number, optional): Number of orders to return. Default is `10`.

**Example Usage:**
> "Show me the last 5 pending orders."

### `process_order_event`
Automates order lifecycle transitions (paid, shipped, cancelled).

**Parameters:**
- `order_id` (string, required): Internal Magento Order ID.
- `event_type` (enum, required): `new`, `paid`, `shipped`, `cancelled`.
- `metadata` (object, optional): Additional context for the event.

---

## 📊 Reporting Tools

### `generate_order_report`
Generate a CSV report (compatible with Excel) of orders based on status and date range.

**Parameters:**
- `status` (string, optional): Order status to include (e.g., `pending`, `complete`).
- `days` (number, optional): Number of days to look back. Default is `30`.

**Example Usage:**
> "Generate an Excel report of all completed orders from the last 7 days."

---

## 🤖 AI & Customer Service

### `customer_chat`
Chat with a virtual Magento store assistant who has context of specific customer orders.

**Parameters:**
- `session_id` (string, required): Unique ID to maintain conversation history.
- `message` (string, required): The customer's message.
- `customer_email` (string, optional): Customer email to retrieve order history for context.

**Example Usage:**
> "Ask the assistant: 'Where is my last order?' for customer customer@example.com"

---

## 🛡️ Error Handling
The API includes built-in fallbacks for **Store-Scoped 404 Errors**. If a request to a specific store fails, the server will automatically attempt a fallback to the `/all/V1` path to ensure data retrieval.
