import assert from "node:assert/strict";
import test from "node:test";

import { extractFields } from "../src/gps_extractor/static/parser.mjs";

test("extracts valid fields from a report", () => {
  assert.deepEqual(
    extractFields(
      "Ocorrencia em 18/10/2026 09:55 nas coordenadas -25.428470, -49.273460 placa ABC1D23",
    ),
    {
      data: "18/10/2026",
      hora: "09:55",
      latitude: "-25.428470",
      longitude: "-49.273460",
      placa: "ABC1D23",
    },
  );
});

test("accepts leap-day date and legacy plate", () => {
  assert.deepEqual(extractFields("29/02/2024 8:03 ABC-1234"), {
    data: "29/02/2024",
    hora: "8:03",
    placa: "ABC-1234",
  });
});

test("rejects invalid dates and out-of-range coordinates", () => {
  assert.deepEqual(
    extractFields("29/02/2023 09:55 coordenadas 91.2, 181.5"),
    {},
  );
});
