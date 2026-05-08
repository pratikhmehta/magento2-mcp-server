
import { magento } from '../src/lib/magento.js';

async function countStores() {
  try {
    const stores = await magento.get('/store/storeViews');
    console.log(`Number of stores (store views): ${stores.length}`);
    console.log('Stores:', JSON.stringify(stores, null, 2));
    
    const websites = await magento.get('/store/websites');
    console.log(`Number of websites: ${websites.length}`);
    
    const storeGroups = await magento.get('/store/stores');
    console.log(`Number of store groups: ${storeGroups.length}`);
    
  } catch (error) {
    console.error('Error fetching stores:', error.message);
  }
}

countStores();
