import { describe, expect, it } from "vitest";
import { leashApiDocument } from "./leash-api";

describe("the Leash API's OpenAPI document", () => {
  const document = leashApiDocument();

  it("matches the committed openapi/leash-api.json (after changing the API, run `npm run openapi`)", async () => {
    await expect(JSON.stringify(document, null, 2) + "\n").toMatchFileSnapshot("../../openapi/leash-api.json");
  });

  it("names every operation and resolves every reference", () => {
    const operations = Object.values(document.paths).flatMap((path) => Object.values(path));
    expect(operations.every((operation) => /^[a-z][A-Za-z]+$/.test(operation.operationId))).toBe(true);

    const references = [...JSON.stringify(document).matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)].map((m) => m[1]);
    expect(references.length).toBeGreaterThan(0);
    for (const name of references) expect(document.components.schemas).toHaveProperty(name);
  });

  it("gives outside agents no way to approve anything", () => {
    const operationIds = Object.values(document.paths).flatMap((path) => Object.values(path).map((o) => o.operationId));
    expect([...Object.keys(document.paths), ...operationIds].filter((name) => /approve/i.test(name))).toEqual([]);
  });
});
