import { magento } from '../src/lib/magento.js';
import axios from 'axios';

jest.mock('axios');

describe('Magento Library', () => {
  test('get should handle successful response', async () => {
    const mockData = { result: 'ok' };
    axios.create().get.mockResolvedValue({ data: mockData });
    
    const result = await magento.get('/test');
    expect(result).toEqual(mockData);
  });

  test('post should handle successful response', async () => {
    const mockData = { id: 1 };
    axios.create().post.mockResolvedValue({ data: mockData });
    
    const result = await magento.post('/test', { foo: 'bar' });
    expect(result).toEqual(mockData);
  });
});
