export function normalizePlate(text) {
  const plate = text.trim().toUpperCase().replace(/[-\s]/g, "");
  return /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/.test(plate) ? plate : null;
}

export function extractPlateCandidates(text) {
  const matches = text.toUpperCase().match(/\b[A-Z]{3}[ -]?(?:\d{4}|\d[A-Z]\d{2})\b/g) ?? [];
  return [...new Set(matches.map(normalizePlate).filter(Boolean))];
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
