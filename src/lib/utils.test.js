import { jsonToCsv } from "./utils.js";

describe("Utility Functions: jsonToCsv", () => {
  it("should correctly convert an array of JSON objects to a CSV string", () => {
    const data = [
      { id: 1, name: "Product A" },
      { id: 2, name: "Product B" },
    ];
    const csv = jsonToCsv(data);

    expect(csv).toContain("id,name");
    expect(csv).toContain('"1","Product A"');
    expect(csv).toContain('"2","Product B"');
  });

  it("should return an empty string when given an empty array", () => {
    expect(jsonToCsv([])).toBe("");
  });
});
