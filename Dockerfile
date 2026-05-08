# Build Stage
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (only production)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code (using specific paths for security)
COPY src/ ./src/
COPY index.js ./

# Use non-root user for security
USER node

# Start the MCP server
CMD ["node", "index.js"]
