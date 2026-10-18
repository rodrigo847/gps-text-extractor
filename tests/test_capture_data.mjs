import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPlateCandidates,
  normalizePlate,
  validateCapturePosition,
} from "../src/gps_extractor/static/capture-data.mjs";

test("normalizes reviewed plates without guessing ambiguous characters", () => {
  assert.equal(normalizePlate("abc-1234"), "ABC1234");
  assert.equal(normalizePlate("abc 1d23"), "ABC1D23");
  assert.equal(normalizePlate("ABCID23"), null);
  assert.equal(normalizePlate("<ABC1D23>"), null);
  assert.equal(normalizePlate("ABC1D23 outra"), null);
});

test("finds distinct OCR candidates for manual review", () => {
  assert.deepEqual(extractPlateCandidates("BRASIL\nABC 1D23\nABC1D23"), ["ABC1D23"]);
  assert.deepEqual(extractPlateCandidates("ABC-1234 XYZ9Z99"), ["ABC1234", "XYZ9Z99"]);
  assert.deepEqual(extractPlateCandidates("nenhuma placa 123"), []);
});

test("retains device coordinates, accuracy and timestamp including zero coordinates", () => {
  const position = { coords: { latitude: 0, longitude: 0, accuracy: 12.5 }, timestamp: 100000 };
  assert.deepEqual(validateCapturePosition(position, 100050), {
    latitude: 0, longitude: 0, accuracy: 12.5, positionTimestamp: 100000,
  });
});

test("rejects stale or invalid location rather than reusing another capture", () => {
  const position = { coords: { latitude: -25.4, longitude: -49.2, accuracy: 20 }, timestamp: 100000 };
  assert.throws(() => validateCapturePosition(position, 116000), /15 segundos/);
  for (const coords of [
    { latitude: 91, longitude: 0, accuracy: 1 },
    { latitude: 0, longitude: 181, accuracy: 1 },
    { latitude: 0, longitude: 0, accuracy: -1 },
    { latitude: NaN, longitude: 0, accuracy: 1 },
    { latitude: "0", longitude: 0, accuracy: 1 },
  ]) {
    assert.throws(() => validateCapturePosition({ ...position, coords }, 100000), /inválidas/);
  }
});
