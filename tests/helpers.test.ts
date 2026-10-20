import { test } from "node:test";
import assert from "node:assert/strict";
import { centavosToPesosInput, effectivePrice, pesosToCentavos } from "../src/lib/money";
import { safeRedirectPath, slugify } from "../src/lib/utils";

test("pesos are parsed into integer centavos", () => {
  assert.equal(pesosToCentavos("1,250.50"), 125050);
  assert.equal(pesosToCentavos("₱248"), 24800);
  assert.equal(pesosToCentavos("12.345"), null);
  assert.equal(pesosToCentavos("abc"), null);
  assert.equal(centavosToPesosInput(28800), "288.00");
});

test("a sale price only applies when it is lower than the regular price", () => {
  assert.equal(effectivePrice({ price: 49800, salePrice: 39800 }), 39800);
  assert.equal(effectivePrice({ price: 49800, salePrice: 59800 }), 49800);
  assert.equal(effectivePrice({ price: 49800, salePrice: null }), 49800);
});

test("slugs and redirects are safe", () => {
  assert.equal(slugify("Parañaque Linen Spray!"), "paranaque-linen-spray");
  assert.equal(safeRedirectPath("/account/orders"), "/account/orders");
  assert.equal(safeRedirectPath("//evil.example"), "/");
  assert.equal(safeRedirectPath("https://evil.example"), "/");
});
