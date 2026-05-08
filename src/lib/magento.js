import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';
import { config } from '../config.js';

/**
 * Magento 2 REST API Client
 * Optimized for DDEV and Standard Magento paths
 */

const httpsAgent = new https.Agent({
  rejectUnauthorized: config.NODE_ENV !== 'development'
});

// Ensure baseURL ends with a slash and doesn't have double slashes
const rawBaseUrl = config.MAGENTO_BASE_URL.endsWith('/') 
  ? config.MAGENTO_BASE_URL 
  : `${config.MAGENTO_BASE_URL}/`;

const client = axios.create({
  baseURL: rawBaseUrl,
  timeout: 30000,
  httpsAgent,
  headers: {
    'Authorization': `Bearer ${config.MAGENTO_TOKEN.trim()}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Magento-MCP-Server/1.0.0'
  },
  // Prevent axios from encoding brackets in searchCriteria
  paramsSerializer: {
    encode: (param) => param // Disable encoding for searchCriteria compatibility
  }
});

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status === 429);
  }
});

const handleRequestError = (error) => {
  const status = error.response ? error.response.status : null;
  const magentoMessage = (error.response && error.response.data && error.response.data.message) || error.message;
  const details = (error.response && error.response.data && error.response.data.parameters) || '';
  
  const enhancedError = new Error(`Magento API Error [${status}]: ${magentoMessage} ${JSON.stringify(details)}`);
  enhancedError.status = status;
  enhancedError.magentoData = error.response ? error.response.data : null;
  
  throw enhancedError;
};

export const magento = {
  /**
   * Performs a GET request.
   * NOTE: We remove the leading slash from 'path' to ensure it appends to baseURL correctly.
   */
  async get(path, params = {}) {
    // Ensure the path is joined correctly to the baseURL
    // We remove leading slashes and handle query parameters properly
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // If the path already contains query params, we don't pass 'params' separately to avoid conflicts
    const config = cleanPath.includes('?') ? { headers: client.defaults.headers } : { params };
    
    try {
      const response = await client.get(cleanPath, config);
      return response.data;
    } catch (error) {
      handleRequestError(error);
    }
  },

  async post(path, body = {}) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    try {
      const response = await client.post(cleanPath, body);
      return response.data;
    } catch (error) {
      handleRequestError(error);
    }
  },

  async put(path, body = {}) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    try {
      const response = await client.put(cleanPath, body);
      return response.data;
    } catch (error) {
      handleRequestError(error);
    }
  }
};
