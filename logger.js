import fs from "fs";
import path from "path";

// Store logs in the project root (or a dedicated /logs directory)
const logFilePath = path.join(process.cwd(), "automated-actions.log");

export const logger = {
  info: (action, details = {}) => log("INFO", action, details),
  warn: (action, details = {}) => log("WARN", action, details),
  error: (action, details = {}) => log("ERROR", action, details),
};

function sanitize(details) {
  // Explicitly handle Error objects because their properties are non-enumerable
  // and would otherwise stringify to an empty object {}
  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack,
    };
  }
  if (typeof details !== "object" || details === null) return details;
  const sanitized = Array.isArray(details) ? [] : {};
  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "email",
    "telephone",
    "cc_number",
    "firstname",
    "lastname",
  ];

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = "[MASKED]";
    } else if (typeof value === "object") {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level, action, details) {
  const safeAction = String(action).replace(/[\r\n]/g, " "); // Prevent CRLF Log Injection
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    action: safeAction,
    ...sanitize(details),
  };

  const logString = JSON.stringify(logEntry) + "\n";

  // Write to stderr so it doesn't corrupt the MCP stdio transport buffer
  process.stderr.write(`[${logEntry.timestamp}] [${level}] ${safeAction}\n`);

  // Append to the file asynchronously so it doesn't block the event loop
  fs.appendFile(logFilePath, logString, "utf8", (err) => {
    if (err)
      process.stderr.write(`Failed to write to log file: ${err.message}\n`);
  });
}
