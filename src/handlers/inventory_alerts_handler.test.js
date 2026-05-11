import { InventoryAlertHandler } from "./inventory_alerts_handler.js";
import { magento } from "../lib/magento.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { sendAlert } from "./notifier.js";

// Mock dependencies
jest.mock("../lib/magento.js", () => ({
  magento: {
    get: jest.fn(),
  },
}));

jest.mock("../lib/cache.js", () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  TTL: { inventory: 120 },
}));

jest.mock("./notifier.js", () => ({
  sendAlert: jest.fn(),
}));

describe("InventoryAlertHandler", () => {
  let consoleSpy;

  beforeAll(() => {
    // Suppress console.error during tests to keep output clean
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console.error after tests
    consoleSpy.mockRestore();
  });

  beforeEach(() => {
    // Clear all mock call counts before every test
    jest.clearAllMocks();
  });

  it("should return cached data if available, skipping the API call", async () => {
    const cachedData = [{ sku: "CACHED-1", qty: 2 }];
    cacheGet.mockReturnValueOnce(cachedData); // Pretend cache has data

    const result = await InventoryAlertHandler.checkAlerts({ threshold: 10 });

    expect(result).toBe(cachedData);
    expect(magento.get).not.toHaveBeenCalled(); // API should NOT be hit
  });

  it("should identify items below the threshold", async () => {
    cacheGet.mockReturnValueOnce(null); // Cache is empty

    // Pretend Magento returns two products
    magento.get.mockResolvedValueOnce({
      items: [
        {
          sku: "LOW",
          name: "Low Stock Item",
          extension_attributes: { stock_item: { qty: 5, is_in_stock: true } },
        },
        {
          sku: "HIGH",
          name: "High Stock Item",
          extension_attributes: { stock_item: { qty: 20, is_in_stock: true } },
        },
      ],
    });

    const result = await InventoryAlertHandler.checkAlerts({ threshold: 10 });

    // It should only return the one item that has less than 10 qty
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe("LOW");
    expect(result[0].qty).toBe(5);

    // It should save the result to the cache
    expect(cacheSet).toHaveBeenCalled();
  });

  it("should trigger an alert if send_notification is true and low stock is found", async () => {
    cacheGet.mockReturnValueOnce(null);
    magento.get.mockResolvedValueOnce({
      items: [
        {
          sku: "LOW",
          name: "Low Stock Item",
          extension_attributes: { stock_item: { qty: 2, is_in_stock: true } },
        },
      ],
    });

    await InventoryAlertHandler.checkAlerts({
      threshold: 10,
      send_notification: true,
    });

    // sendAlert should have been called with the correct email payload
    expect(sendAlert).toHaveBeenCalledTimes(1);
    expect(sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "low_stock",
        subject: expect.stringContaining("1 Items Low on Stock"),
      }),
    );
  });
});
