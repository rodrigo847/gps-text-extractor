import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPlateCandidates,
  normalizePlate,
  validateCapturePosition,
  waitForCapturePosition,
} from "../src/gps_extractor/static/capture-data.mjs";

test("normalizes reviewed plates without guessing ambiguous characters", () => {
  assert.equal(normalizePlate("abc-1234"), "ABC1234");
  assert.equal(normalizePlate("abc 1d23"), "ABC1D23");
  assert.equal(normalizePlate("ABCID23"), null);
  assert.equal(normalizePlate("<ABC1D23>"), null);
  assert.equal(normalizePlate("ABC1D23 outra"), null);
});

test("waits for a fresh GPS update after a cached position and clears the watch", async () => {
  let success;
  let waiting = 0;
  const cleared = [];
  const geo = {
    watchPosition(callback, error, options) {
      success = callback;
      assert.equal(options.maximumAge, 0);
      assert.equal(options.enableHighAccuracy, true);
      return 7;
    },
    clearWatch(id) { cleared.push(id); },
  };
  const pending = waitForCapturePosition(geo, {
    now: () => 100000, onWaiting: () => waiting++,
  });
  success({ coords: { latitude: 0, longitude: 0, accuracy: 10 }, timestamp: 50000 });
  assert.equal(waiting, 1);
  assert.deepEqual(cleared, []);
  const fresh = { coords: { latitude: 0, longitude: 0, accuracy: 10 }, timestamp: 100000 };
  success(fresh);
  assert.equal(await pending, fresh);
  assert.deepEqual(cleared, [7]);
});

test("GPS timeout and leaving the page both stop watching", async () => {
  for (const cancel of [false, true]) {
    const cleared = [];
    const geo = { watchPosition: () => 8, clearWatch: id => cleared.push(id) };
    const controller = new AbortController();
    const pending = waitForCapturePosition(geo, {
      signal: controller.signal, timeoutMs: 10,
    });
    if (cancel) controller.abort();
    await assert.rejects(pending, cancel ? /cancelada/ : /GPS recente/);
    assert.deepEqual(cleared, [8]);
  }
});

test("GPS permission denied fails clearly and clears the watch", async () => {
  const cleared = [];
  const geo = {
    watchPosition(success, failure) {
      queueMicrotask(() => failure({ code: 1 }));
      return 9;
    },
    clearWatch: id => cleared.push(id),
  };
  await assert.rejects(waitForCapturePosition(geo), /Permissão de localização negada/);
  assert.deepEqual(cleared, [9]);
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
