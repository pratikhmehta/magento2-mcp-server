import { magento } from '../src/lib/magento.js';
import { config } from '../src/config.js';

/**
 * Final Smoke Test Script
 * Verifies that the server is 100% ready for action
 */
async function runFinalTest() {
  console.log('🔍 Running Final Connectivity Check...');

  try {
    // 1. Test Products API (Working)
    console.log('📡 Testing Products API...');
    await magento.get('/products', { 'searchCriteria[pageSize]': 1 });
    console.log('✅ Products API: SUCCESS');

    // 2. Test MSI Inventory (Working)
    console.log('📡 Testing MSI Inventory...');
    await magento.get('/inventory/source-items', { 'searchCriteria[pageSize]': 1 });
    console.log('✅ MSI Inventory: SUCCESS');

    console.log('\n✨ CONGRATULATIONS! Your Magento MCP Server is 100% connected.');
    console.log('You can now start using Claude to manage your store.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection check failed');
    console.error(`Message: ${error.message}`);
    process.exit(1);
  }
}

runFinalTest();
