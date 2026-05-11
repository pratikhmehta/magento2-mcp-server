module.exports = {
  apps: [
    {
      name: "magento2-mcp-server",
      script: "./server-sse.js",
      instances: 1,
      autorestart: true,
      watch: false,
      node_args: "--max-old-space-size=512 --optimize-for-size --no-warnings",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
