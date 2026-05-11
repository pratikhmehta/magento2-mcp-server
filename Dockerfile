# Build Stage
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

# Apply Node.js V8 memory optimizations for production
ENV NODE_OPTIONS="--max-old-space-size=512 --no-warnings"

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (only production)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and necessary root files
COPY src/ ./src/
COPY index.js logger.js server-sse.js ecosystem.config.cjs ./

# Use non-root user for security
USER node

# Expose the SSE port (3000) and Health Check port (3001)
EXPOSE 3000 3001

# Start the MCP server
CMD ["node", "--optimize-for-size", "index.js"]
