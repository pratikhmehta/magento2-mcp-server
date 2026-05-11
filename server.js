/**
 * Magento 2 MCP Server - Bridge
 * This file serves as an entry point that redirects to the TypeScript implementation.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.error('Starting Magento 2 MCP Server via TSX...');

const isWindows = process.platform === 'win32';
const child = spawn(isWindows ? 'npx.cmd' : 'npx', ['tsx', path.join(__dirname, 'server/server.ts')], {
    stdio: 'inherit'
});

child.on('exit', (code) => {
    process.exit(code || 0);
});
