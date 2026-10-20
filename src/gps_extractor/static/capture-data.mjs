export function normalizePlate(text) {
  const plate = text.trim().toUpperCase().replace(/[-\s]/g, "");
  return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(plate) ? plate : null;
}

export function calculateCaptureCrop(sourceWidth, sourceHeight, previewWidth, previewHeight) {
  if (![sourceWidth, sourceHeight, previewWidth, previewHeight]
    .every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Dimensões da câmera indisponíveis. Abra a câmera novamente.");
  }
  const scale = Math.max(previewWidth / sourceWidth, previewHeight / sourceHeight);
  const width = previewWidth * 0.9 / scale;
  const height = Math.min(previewHeight / scale, width / 3.2);
  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
    outputWidth: Math.max(1, Math.min(2400, Math.round(width))),
    outputHeight: Math.max(1, Math.round(Math.min(2400, Math.round(width)) * height / width)),
  };
}

export function extractPlateCandidates(text) {
  const matches = text.toUpperCase().match(/\b[A-Z]{3}[ -]?(?:\d{4}|\d[A-Z]\d{2})\b/g) ?? [];
  return [...new Set(matches.map(normalizePlate).filter(Boolean))];
}

export function calculateOcrEnhancement(meanLuminance) {
  if (!Number.isFinite(meanLuminance) || meanLuminance < 0 || meanLuminance > 255) {
    throw new Error("A luminosidade da foto é inválida.");
  }
  if (meanLuminance < 80) return { brightness: 1.8, contrast: 1.15 };
  if (meanLuminance < 120) return { brightness: 1.4, contrast: 1.1 };
  return { brightness: 1, contrast: 1 };
}

export function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function validateCapturePosition(position, capturedAt) {
  const { latitude, longitude, accuracy } = position.coords;
  if (![latitude, longitude, accuracy, position.timestamp, capturedAt].every(Number.isFinite) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0) {
    throw new Error("O aparelho retornou coordenadas ou precisão inválidas.");
  }
  if (Math.abs(capturedAt - position.timestamp) > 15000) {
    throw new Error("A posição retornada tem mais de 15 segundos de diferença da captura. Tente novamente.");
  }
  return { latitude, longitude, accuracy, positionTimestamp: position.timestamp };
}

export function waitForCapturePosition(geolocation, {
  signal, onWaiting = () => {}, timeoutMs = 25000, now = Date.now,
} = {}) {
  return new Promise((resolve, reject) => {
    let watchId;
    let settled = false;
    const finish = (error, position) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(position);
    };
    const abort = () => finish(new Error("Solicitação de GPS cancelada."));
    const timer = setTimeout(() => finish(new Error(
      "Não foi possível obter um GPS recente. Ative a localização precisa e tente em um local aberto.",
    )), timeoutMs);
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    try {
      watchId = geolocation.watchPosition((position) => {
        if (settled) return;
        const receivedAt = now();
        if (Number.isFinite(position.timestamp) &&
            Math.abs(receivedAt - position.timestamp) > 15000) {
          onWaiting();
          return;
        }
        try {
          validateCapturePosition(position, receivedAt);
          finish(null, position);
        } catch (error) {
          finish(error);
        }
      }, (error) => {
        if (error.code === 1) {
          finish(new Error("Permissão de localização negada. Libere o acesso nas configurações do navegador."));
        } else {
          onWaiting();
        }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs });
      if (settled) geolocation.clearWatch(watchId);
    } catch (error) {
      finish(error);
    }
  });
}
