import assert from "node:assert/strict";
import test from "node:test";

import { createMapLocation, extractFields } from "../src/gps_extractor/static/parser.mjs";

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

test("builds a map marker without sending plate or report to the provider", () => {
  const fields = extractFields("-25.428470, -49.273460 ABC1D23");
  const location = createMapLocation(fields);
  const embed = new URL(location.embedUrl);
  assert.equal(embed.origin, "https://www.openstreetmap.org");
  assert.equal(embed.searchParams.get("marker"), "-25.42847,-49.27346");
  assert.deepEqual([...embed.searchParams.keys()], ["bbox", "layer", "marker"]);
  assert.equal(new URL(location.externalUrl).searchParams.get("mlat"), "-25.42847");
  assert.equal(new URL(location.externalUrl).searchParams.get("mlon"), "-49.27346");
  assert.ok(!JSON.stringify(location).includes("ABC1D23"));
});

test("does not create a map for missing, empty or invalid coordinates", () => {
  for (const fields of [
    {},
    { latitude: "-25.4" },
    { latitude: "", longitude: "0" },
    { latitude: "NaN", longitude: "0" },
    { latitude: "Infinity", longitude: "0" },
    { latitude: "91", longitude: "0" },
    { latitude: "0", longitude: "-181" },
  ]) {
    assert.equal(createMapLocation(fields), null);
  }
});

test("accepts zero and geographic boundaries without a plate", () => {
  for (const [latitude, longitude] of [["0", "0"], ["90", "180"], ["-90", "-180"]]) {
    const location = createMapLocation({ latitude, longitude });
    const bounds = new URL(location.embedUrl).searchParams.get("bbox").split(",").map(Number);
    assert.ok(bounds[0] >= -180 && bounds[2] <= 180);
    assert.ok(bounds[1] >= -90 && bounds[3] <= 90);
  }
});
