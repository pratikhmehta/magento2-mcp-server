# How the Magento 2 MCP Server Works

### A plain-language guide for your project team

---

## Table of Contents

1. [What is MCP? — The Simple Explanation](#1-what-is-mcp--the-simple-explanation)
2. [The Big Picture — How Everything Connects](#2-the-big-picture--how-everything-connects)
3. [How the Server Starts Up](#3-how-the-server-starts-up)
4. [How a Request Travels Through the System](#4-how-a-request-travels-through-the-system)
5. [Module 1 — Inventory Alerts (How it Runs)](#5-module-1--inventory-alerts-how-it-runs)
6. [Module 2 — Order Automation (How it Runs)](#6-module-2--order-automation-how-it-runs)
7. [Module 3 — AI Customer Service (How it Runs)](#7-module-3--ai-customer-service-how-it-runs)
8. [How Claude (AI) Gets Involved](#8-how-claude-ai-gets-involved)
9. [How Errors Are Handled](#9-how-errors-are-handled)
10. [Environment Variables — What Each One Does](#10-environment-variables--what-each-one-does)
11. [Running Locally Step by Step](#11-running-locally-step-by-step)
12. [Running with Docker](#12-running-with-docker)
13. [Everyday Analogy — The Restaurant Kitchen](#13-everyday-analogy--the-restaurant-kitchen)
14. [Glossary of Terms](#14-glossary-of-terms)

---

## 1. What is MCP? — The Simple Explanation

**MCP stands for Model Context Protocol.**

Think of it like a **universal plug socket** for AI tools.

Normally, if you want an AI (like Claude) to do something useful — like check your Magento store's stock levels or reply to a customer — you would have to write custom glue code every single time. It would be messy, different each time, and hard to reuse.

MCP solves this by giving AI a **standard way to call tools** (functions that do real things in the real world).

Here is a simple comparison:

| Without MCP                          | With MCP                              |
| ------------------------------------ | ------------------------------------- |
| Custom API call for every action     | One standard protocol for all actions |
| Hard to reuse across projects        | Tools are plug-and-play               |
| AI cannot directly call your systems | AI can call tools on your behalf      |
| You write the glue code manually     | MCP handles the connection layer      |

In this project, the MCP server is the **bridge** between Claude (the AI brain) and your Magento 2 store (the business system).

---

## 2. The Big Picture — How Everything Connects

Here is the full picture of what is running and how the parts talk to each other:

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR COMPUTER / SERVER                   │
│                                                             │
│   ┌──────────────┐      ┌───────────────────────────────┐  │
│   │   Claude AI  │◄────►│     MCP Server (Node.js)      │  │
│   │  (the brain) │      │                               │  │
│   └──────────────┘      │  Tools registered:            │  │
│                         │  • check_inventory_alerts     │  │
│                         │  • process_order_event        │  │
│                         │  • customer_chat              │  │
│                         └──────────────┬────────────────┘  │
│                                        │                    │
│                                        │ HTTP REST calls    │
│                                        ▼                    │
│                         ┌─────────────────────────────┐    │
│                         │     Magento 2 Store          │    │
│                         │  (your actual shop data)     │    │
│                         └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                   │
                    Alerts sent via │
                                   ▼
              ┌──────────────────────────────┐
              │  Email / Slack / Webhook     │
              └──────────────────────────────┘
```

**In plain words:**

- **Claude AI** is the brain — it decides what to do.
- **MCP Server** is the body — it actually does the work.
- **Magento 2** is the database — it holds all your shop data.
- **Email/Slack/Webhook** is the mouth — it tells people when something happens.

---

## 3. How the Server Starts Up

When you run `node src/lib/mcp.js`, here is exactly what happens, step by step:

### Step 1 — Config is validated

The server reads your `.env` file and checks that all required values are present.

```
MAGENTO_BASE_URL  ✓ found
MAGENTO_TOKEN     ✓ found
GEMINI_API_KEY ✓ found
ALERT_EMAIL       ✓ found
```

If any required value is missing, the server **stops immediately** and tells you which variable is missing. This prevents confusing errors later.

### Step 2 — Magento client is initialised

A reusable HTTP client is set up with:

- Your Magento base URL
- Your Bearer token in every request header
- Automatic retry if Magento returns a "too busy" (429) error

### Step 3 — Tools are loaded automatically

The server scans the `src/tools/` folder and loads every `.js` file it finds. Each file registers itself as an MCP tool. You never need to manually list your tools — just drop a new file in the folder and it appears automatically.

### Step 4 — MCP transport opens

The server opens a transport layer to listen for AI messages. By default locally, it uses **stdio** (standard input/output), which is like a direct phone line to Claude Desktop or Cursor.
Alternatively, it can be started with PM2 to use **SSE (Server-Sent Events)**, which listens over HTTP for remote connections.

### Step 5 — Server is ready

The server logs `MCP server running` and waits. It is now ready to receive tool calls from Claude or any MCP-compatible client.

---

## 4. How a Request Travels Through the System

Here is the exact journey of a single request, for example: _"Check if any products are running low on stock."_

```
Step 1:  Claude receives instruction
         "Check inventory levels"
              │
              ▼
Step 2:  Claude picks the right tool
         Selects: check_inventory_alerts
         Sends:  { threshold: 10 }
              │
              ▼
Step 3:  MCP Server receives the tool call
         Validates the input shape with Zod
              │
              ▼
Step 4:  Handler runs the business logic
         Calls alert_rules.shouldAlert()
              │
              ▼
Step 5:  Magento client makes the API call
         GET /V1/inventory/source-items
         Bearer Token: abc123...
              │
              ▼
Step 6:  Magento returns data
         [ { sku: "SHOE-42", qty: 3 },
           { sku: "BAG-01",  qty: 7 } ]
              │
              ▼
Step 7:  Handler processes the results
         Applies threshold and cooldown rules
              │
              ▼
Step 8:  Notifier fires alerts
         Email sent to admin
         Slack message posted
              │
              ▼
Step 9:  MCP Server returns result to AI
         { alerts_sent: 2, skus: ["SHOE-42", "BAG-01"] }
              │
              ▼
Step 10: AI reports back to the user
         "Found 2 low stock items: SHOE-42 (qty 3)
          and BAG-01 (qty 7). Alerts have been sent."
```

The whole journey takes under 2 seconds in normal conditions.

---

## 5. Module 1 — Inventory Alerts (How it Runs)

### What it does

Watches your Magento store's stock levels and fires alerts when products drop below a quantity threshold.

### How it is triggered

This module runs when someone (or a scheduled task) calls the `check_inventory_alerts` tool.

### The flow in plain language

1. **You set a threshold** — for example, alert me when any product has fewer than 10 units left.
2. **The tool asks Magento** — "give me all products with quantity less than 10."
3. **Magento replies** — here is a list of low-stock items.
4. **The cooldown check runs** — was an alert already sent for this SKU in the last 60 minutes? If yes, skip it to avoid spam.
5. **Alerts are sent** — email to the admin, message to Slack.
6. **Result is returned** — a summary of what was found and what was alerted.

### The cooldown system explained

Imagine a product called `BOOT-RED-42` drops to 3 units at 9:00 AM. An alert fires. Then someone checks inventory again at 9:15 AM — the product is still at 3 units. Without a cooldown, another alert fires. And another. And another.

The cooldown system stores the time of the last alert for each SKU in memory. If you call `check_inventory_alerts` again within the cooldown window (default: 60 minutes), the system skips that SKU and does not spam you.

```
9:00 AM  →  BOOT-RED-42 qty=3  →  Alert sent    ✓
9:15 AM  →  BOOT-RED-42 qty=3  →  In cooldown   ✗ (skipped)
10:05 AM →  BOOT-RED-42 qty=3  →  Alert sent    ✓ (cooldown expired)
```

### Key files involved

| File                                       | Role                                             |
| ------------------------------------------ | ------------------------------------------------ |
| `src/handlers/inventory_alerts_handler.js` | Cooldown logic, threshold checks, and validation |
| `src/handlers/notifier.js`                 | Sends email, Slack, and webhook notifications    |
| `src/lib/magento.js`                       | Makes the actual HTTP call to Magento            |

---

## 6. Module 2 — Order Automation (How it Runs)

### What it does

Listens for order events (new order, payment received, cancellation) and automatically takes action without anyone needing to click anything.

### How it is triggered

Your Magento store (or a webhook integration) calls the `process_order_event` tool with an order ID and the event type.

### The flow in plain language

1. **An event arrives** — for example, `{ order_id: "000123", event_type: "paid" }`.
2. **The tool fetches the full order** from Magento — gets customer details, payment method, items, total, etc.
3. **The rules engine runs** — checks the order against all automation rules:
   - Is the payment method PayPal? Auto-fulfill.
   - Is the order total under ₹5000? Auto-fulfill.
   - Is the customer a wholesale account? Flag for manual review.
   - Is it cancelled? Put the stock back.
4. **The action executes** — if a rule matched, the system writes back to Magento (updates order status, triggers shipment, restocks items).
5. **Result is returned** — a summary of what action was taken.

### The rules engine explained

The rules engine is like a list of "if this, then that" instructions:

```
IF  event = "paid"
AND payment_method = "paypal"
AND total > 0
THEN  action = "auto_fulfill"

IF  event = "cancelled"
THEN  action = "restock_items"

IF  event = "new"
AND customer_group = "wholesale"
THEN  action = "flag_for_review"

OTHERWISE  no automated action (human decides)
```

Rules are checked in order. The first rule that matches wins. If no rule matches, the system does nothing and returns `action: null`.

### Idempotency — why it matters

Imagine Magento sends the same `order_paid` event twice due to a network hiccup. Without protection, your order would be fulfilled twice — two shipments for one payment. The system prevents this by checking the current order status before acting. If the order is already in `processing`, it will not trigger fulfillment again.

### Key files involved

| File                                       | Role                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| `src/handlers/order_automation_handler.js` | Core rules engine and event processing logic               |
| `src/handlers/order_writer.js`             | Writes changes back to Magento (status, shipment, restock) |
| `src/lib/magento.js`                       | HTTP calls to Magento REST API                             |

---

## 7. Module 3 — AI Customer Service (How it Runs)

### What it does

Handles customer chat messages using Gemini AI, with access to the customer's real order history from Magento. It can answer questions, look up orders, and escalate to a human when needed.

### How it is triggered

A chat widget, support platform, or API caller sends a message to the `customer_chat` tool with the customer's message and (optionally) their email address.

### The flow in plain language

1. **Message arrives** — `{ session_id: "abc", message: "Where is my order?", customer_email: "ali@example.com" }`.
2. **Context Assembly** — the system looks up the customer's last 5 orders from Magento to provide background context.
3. **Gemini takes over** — the system builds a message with:
   - A system prompt explaining the AI's role as your store assistant
   - The customer's last 5 orders injected as context
   - The full conversation history for this session
   - The new customer message
4. **Gemini generates a reply** — reads all the context and writes a helpful, accurate response.
5. **Escalation check** — if the customer is very upset or the query is too complex, Gemini signals `ESCALATE: TRUE` and the system can route to a human agent.
6. **History is stored** — the conversation history is kept in memory (and garbage-collected after 1 hour of inactivity).
7. **Reply is returned** — the customer sees the AI's response in the chat.

### The session system explained

Every conversation has a `session_id` (like a unique conversation ID). This lets the AI remember what was said earlier in the same chat:

```
Customer: "Where is my order?"
AI:       "Your order #000123 was shipped yesterday."

Customer: "Can I change the delivery address?"
AI:       "I can see you are asking about order #000123.
           Unfortunately the address cannot be changed
           once shipped. Would you like help with a return?"
```

Without the session, the AI would not know what "my order" refers to in the second message.

### Key files involved

| File                                  | Role                                        |
| ------------------------------------- | ------------------------------------------- |
| `src/handlers/ai_customer_handler.js` | Handles Gemini API chat and session history |
| `src/lib/magento.js`                  | Fetches customer order history              |
| Google Generative AI                  | Generates the actual chat reply via Gemini  |

## 8. How the AI (Gemini) Gets Involved

The AI model is not always running. It only gets called when a tool needs it. Here is exactly what the system sends to Gemini when a customer chat arrives:

### What goes into the Gemini API call

```json
{
  "systemInstruction": {
    "parts": [
      {
        "text": "You are a Magento Store Assistant.\n               Your goal is to help customers with their inquiries using the provided order history.\n               Always respond in the customer's detected language.\n\n               Customer Context (ali@example.com):\n               - Order #000123: Status complete, Total 2400 USD, Date 2023-05-02\n               - Order #000089: Status processing, Total 800 USD, Date 2023-04-10\n               \n               If the customer is frustrated, asks for a human, or their issue cannot be resolved through information alone, include the instruction 'ESCALATE: TRUE' at the end of your response."
      }
    ]
  },
  "history": [
    {
      "role": "user",
      "parts": [{ "text": "Where is my latest order?" }]
    }
  ]
}
```

### What Claude sends back

```json
{
  "content": [
    {
      "type": "text",
      "text": "Your most recent order #000123 was placed on 2 May
               and has been shipped. You should receive it within
               1-2 business days. Is there anything else I can help with?"
    }
  ]
}
```

The system extracts the text, stores it in the session history, and returns it to whoever called the tool.

### When Claude is NOT called (fast path)

To save time and cost, simple order status queries bypass Claude entirely:

```
Customer asks: "where is my order"
Intent classifier → order_status (high confidence)
System fetches order from Magento directly
System formats a plain reply: "Order #000123 is shipped."
Claude is never called.  ← saves ~1 second and API cost
```

---

## 9. How Errors Are Handled

The system is built to fail gracefully — one broken thing should not crash everything else.

### Error types and what happens

| Error                                 | What the system does                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Magento returns 401 (bad token)       | Throws `AuthError`, logs it, returns clear message                            |
| Magento returns 404 (order not found) | Returns `{ error: "Order not found" }` — does NOT crash                       |
| Magento returns 503 (overloaded)      | Retries once after 2 seconds, then gives up                                   |
| Magento returns 429 (rate limited)    | Waits the time Magento requests, then retries                                 |
| Claude API is down                    | Returns a fallback message: "I'm having trouble right now, please try again." |
| Missing `.env` variable               | Server refuses to start, prints exactly which variable is missing             |
| Duplicate alert within cooldown       | Silently skipped — no error, just logged                                      |

### The retry strategy

```
Request fails with 503
     │
     ├─ Wait 2 seconds
     │
     └─ Retry once
           │
           ├─ Success → continue normally
           │
           └─ Fails again → throw error, return failure to caller
```

No infinite retries — the system tries once more and then gives up clearly rather than hanging forever.

---

## 10. Environment Variables — What Each One Does

Create a `.env` file in your project root. Here is what each variable controls:

```bash
# ─── Magento Connection ───────────────────────────────────────────

# The base URL of your Magento 2 store (no trailing slash)
MAGENTO_BASE_URL=https://yourstore.com

# Admin API token — generate in Magento Admin → System → Integrations
MAGENTO_TOKEN=your_magento_api_token_here

# ─── Anthropic / Claude ──────────────────────────────────────────

# Your Claude API key from console.anthropic.com
GEMINI_API_KEY=sk-ant-xxxxxxxxxxxxx

# ─── Notification Channels ───────────────────────────────────────

# Email address to receive low stock and order alerts
ALERT_EMAIL=admin@yourstore.com

# SMTP settings for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

# Slack webhook URL (optional — skip if not using Slack)
# Get this from: Slack → Your App → Incoming Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# Generic webhook for order events (optional)
ALERT_WEBHOOK_URL=https://yourwebhook.com/receive

# ─── Alert Settings ──────────────────────────────────────────────

# How long (in minutes) before the same SKU can be alerted again
ALERT_COOLDOWN_MINUTES=60

# Default low stock threshold
DEFAULT_STOCK_THRESHOLD=10
```

**Important:** Never commit your `.env` file to Git. The `.env.example` file (with fake values) is safe to commit.

---

## 11. Running Locally Step by Step

Follow these steps exactly to get the server running on your laptop:

### Prerequisites

- Node.js version 20 or higher (`node --version` to check)
- Access to a Magento 2 store with API credentials
- An Anthropic API key

### Step 1 — Clone and install

```bash
git clone https://github.com/yourorg/magento-mcp.git
cd magento-mcp
npm install
```

### Step 2 — Set up environment

```bash
cp .env.example .env
# Now open .env in your editor and fill in real values
```

### Step 3 — Run the smoke test

This checks that your Magento credentials actually work before you do anything else:

```bash
npm run smoke
```

Expected output:

```
✓ Store config loaded: My Magento Store
✓ Inventory API accessible: 1 item found
All systems go.
```

If you see an error, fix your `.env` values before continuing.

### Step 4 — Start the MCP server

```bash
node src/lib/mcp.js
```

Expected output:

```
Config validated ✓
Magento client ready ✓
Tools loaded: check_inventory_alerts, process_order_event, customer_chat
MCP server running on stdio transport
```

### Step 5 — Run the tests

```bash
npm test
```

All tests should pass with green checkmarks. If any test fails, do not deploy.

---

## 12. Running with Docker

Docker packages the whole server into a container so it runs the same way everywhere.

### Step 1 — Build the image

```bash
docker build -t magento-mcp .
```

### Step 2 — Start with Docker Compose

```bash
docker compose up -d
```

The `-d` flag runs it in the background.

### Step 3 — Check it is running

```bash
docker compose ps
# Should show: magento-mcp   running   (healthy)

docker compose logs -f
# Shows live logs from the server
```

### Step 4 — Stop it

```bash
docker compose down
```

### What the health check does

Docker automatically checks the container every 30 seconds. If the server process has crashed, Docker restarts it automatically. You do not need to monitor it manually.

---

## 13. Everyday Analogy — The Restaurant Kitchen

If technical explanations are still confusing, here is the whole system explained as a restaurant:

| Technical thing          | Restaurant equivalent                                      |
| ------------------------ | ---------------------------------------------------------- |
| MCP Server               | The kitchen                                                |
| Claude AI                | The head chef                                              |
| Magento 2                | The pantry and order book                                  |
| MCP Tools                | Cooking stations (grill, fry, salad)                       |
| Inventory Alerts tool    | The stock checker who shouts "we're out of chicken!"       |
| Order Automation tool    | The expeditor who moves orders through the line            |
| AI Customer Service tool | The waiter who takes customer questions back to the chef   |
| `.env` file              | The kitchen's setup sheet (addresses, codes, access cards) |
| Notifier (email/Slack)   | The PA system that announces things to staff               |

**How an order flows through the restaurant:**

1. A customer (chat message) walks in and asks: "Is my food ready?"
2. The waiter (customer_chat tool) checks the order book (Magento).
3. If it is a simple question, the waiter answers directly without bothering the chef.
4. If it is complex, the waiter goes to the head chef (Claude AI).
5. The chef checks the order book, thinks, and gives the waiter an answer.
6. The waiter goes back and tells the customer.

Meanwhile in the back:

1. The stock checker (inventory_alerts) notices the bread rolls are down to 3.
2. They shout over the PA (notifier) to the manager.
3. The manager (you) gets an email or Slack message.

---

## 14. Glossary of Terms

| Term                  | What it means in plain language                                            |
| --------------------- | -------------------------------------------------------------------------- |
| **MCP**               | Model Context Protocol — the standard language Claude uses to call tools   |
| **Tool**              | A specific action the server can perform, like checking stock or chatting  |
| **Handler**           | The code behind a tool that contains the actual logic                      |
| **Magento REST API**  | A way to read and write Magento data over HTTP                             |
| **Bearer Token**      | A password for the Magento API (goes in every request header)              |
| **Zod**               | A library that validates input data shape before processing                |
| **Cooldown**          | A waiting period that prevents the same alert from firing repeatedly       |
| **Idempotency**       | Doing the same operation twice gives the same result — no double actions   |
| **Escalation**        | When the AI decides a human agent should take over the conversation        |
| **stdio transport**   | The MCP server listens via keyboard input / terminal output (used locally) |
| **SSE transport**     | Server-Sent Events — a way to connect to the MCP server remotely over HTTP |
| **Session**           | A memory of one customer's conversation, stored temporarily in RAM         |
| **Intent**            | What the customer is trying to do (check order, request refund, etc.)      |
| **Fast path**         | Skipping Claude for simple queries to save time and cost                   |
| **Dead-letter queue** | Failed jobs that could not be processed, stored for manual review          |
| **Smoke test**        | A quick sanity check run before anything else, to catch broken config      |
| **Docker Compose**    | A tool that starts all your containers with one command                    |
| **Health check**      | Docker's automatic test to see if the server is still alive                |

---

## 15. Production Execution & PM2

When running in a production environment, this server relies on robust memory management and strict validation to run continuously as a background process:

1. **Zod Input Validation:** Every tool call from the AI is strictly parsed. If the AI hallucinates a parameter, it is rejected before it ever hits the Magento API.
2. **Garbage Collection:** Memory caches and rate limiters are actively swept every 60 seconds to preserve RAM.
3. **Audit Logging:** Every automated write action is logged to `automated-actions.log` with any PII safely masked.

### Deploying as a Background Service

If deploying to a VPS, you can run the server continuously using **PM2** and the SSE (Server-Sent Events) transport layer. The configuration automatically applies optimized V8 engine flags (like `--optimize-for-size`).

```bash
# Start the server
npx pm2 start ecosystem.config.cjs

# View live logs
npx pm2 logs magento2-mcp-server
```

This exposes an HTTP endpoint at `http://localhost:3000/sse` that web applications or remote AI agents can connect to.

---

_Document version: Week 1–2 build_
_Last updated: May 2026_
_For questions, refer to the Phase-wise Prompt Guide in the project root._
