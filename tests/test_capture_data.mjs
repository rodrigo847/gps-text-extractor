import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPlateCandidates,
  normalizePlate,
  validateCapturePosition,
  waitForCapturePosition,
  calculateCaptureCrop,
  calculatePhotoSize,
  buildPhotoEmailUrl,
  MAX_CAPTURE_ACCURACY_METERS,
} from "../src/gps_extractor/static/capture-data.mjs";

test("normalizes reviewed plates without guessing ambiguous characters", () => {
  assert.equal(normalizePlate("abc-1234"), "ABC1234");
  assert.equal(normalizePlate("abc 1d23"), "ABC1D23");
  assert.equal(normalizePlate("ABCID23"), null);
  assert.equal(normalizePlate("<ABC1D23>"), null);
  assert.equal(normalizePlate("ABC1D23 outra"), null);
});

test("capture crop matches the visible guide for landscape and portrait cameras", () => {
  for (const [sourceWidth, sourceHeight] of [[3840, 2160], [720, 1280], [1920, 1080]]) {
    const previewWidth = 320;
    const previewHeight = 180;
    const crop = calculateCaptureCrop(sourceWidth, sourceHeight, previewWidth, previewHeight);
    const scale = Math.max(previewWidth / sourceWidth, previewHeight / sourceHeight);
    const offsetX = (sourceWidth * scale - previewWidth) / 2;
    const offsetY = (sourceHeight * scale - previewHeight) / 2;
    assert.ok(Math.abs(crop.x * scale - offsetX - previewWidth * 0.05) < 0.001);
    assert.ok(Math.abs(crop.y * scale - offsetY -
      (previewHeight - previewWidth * 0.9 / 3.2) / 2) < 0.001);
    assert.ok(crop.x >= 0 && crop.y >= 0);
    assert.ok(crop.x + crop.width <= sourceWidth);
    assert.ok(crop.y + crop.height <= sourceHeight);
    assert.ok(crop.outputWidth <= 2400);
    assert.ok(crop.outputWidth <= Math.round(crop.width));
  }
});

test("capture crop rejects unavailable preview dimensions", () => {
  assert.throws(() => calculateCaptureCrop(1920, 1080, 0, 0), /Dimensões/);
});

test("photo dimensions preserve the full frame within the size limit", () => {
  assert.deepEqual(calculatePhotoSize(3840, 2160), { width: 2400, height: 1350 });
  assert.deepEqual(calculatePhotoSize(720, 1280), { width: 720, height: 1280 });
  assert.throws(() => calculatePhotoSize(0, 1080), /Dimensões/);
});

test("prepares a mail draft for both recipients with the location and attachment reminder", () => {
  const url = buildPhotoEmailUrl({
    latitude: -25.4,
    longitude: -49.2,
    accuracy: 12.5,
    capturedAt: new Date(2026, 9, 20, 12, 30).getTime(),
  });
  assert.match(url, /^mailto:planejamarketing@gmail\.com,rtechdigitais@gmail\.com\?/);
  assert.match(decodeURIComponent(url), /Latitude: -25\.4/);
  assert.match(decodeURIComponent(url), /Longitude: -49\.2/);
  assert.match(decodeURIComponent(url), /Anexe manualmente o arquivo da foto/);
  assert.throws(() => buildPhotoEmailUrl({}), /Coordenadas ou horário/);
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

test("waits for a GPS reading within the accuracy limit", async () => {
  let success;
  const waiting = [];
  const cleared = [];
  const geo = {
    watchPosition(callback) {
      success = callback;
      return 11;
    },
    clearWatch(id) { cleared.push(id); },
  };
  const pending = waitForCapturePosition(geo, {
    now: () => 100000,
    onWaiting: (info) => waiting.push(info),
  });
  success({
    coords: { latitude: -25.4, longitude: -49.2, accuracy: 2000 },
    timestamp: 100000,
  });
  assert.equal(waiting[0].reason, "accuracy");
  assert.equal(waiting[0].position.coords.accuracy, 2000);
  assert.deepEqual(cleared, []);

  const precise = {
    coords: {
      latitude: -25.4,
      longitude: -49.2,
      accuracy: MAX_CAPTURE_ACCURACY_METERS,
    },
    timestamp: 100000,
  };
  success(precise);
  assert.equal(await pending, precise);
  assert.deepEqual(cleared, [11]);
});

test("rejects an inaccurate GPS reading if accuracy does not improve in time", async () => {
  const cleared = [];
  const geo = {
    watchPosition(success) {
      queueMicrotask(() => success({
        coords: { latitude: -25.4, longitude: -49.2, accuracy: 2000 },
        timestamp: Date.now(),
      }));
      return 12;
    },
    clearWatch(id) { cleared.push(id); },
  };
  await assert.rejects(
    waitForCapturePosition(geo, { timeoutMs: 10 }),
    /precisão do GPS permaneceu acima de ±500 m/,
  );
  assert.deepEqual(cleared, [12]);
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
