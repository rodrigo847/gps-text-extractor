const DATE_TIME =
  /\b(?<date>\d{2}(?<separator>[/-])\d{2}\k<separator>\d{4})\D+(?<time>\d{1,2}:\d{2})\b/g;
const COORDINATES =
  /(?<![\w.])(?<latitude>[+-]?\d+\.\d+)[,;/ ]+(?<longitude>[+-]?\d+\.\d+)(?![\w.])/g;
const PLATE = /\b(?:[A-Z]{3}-?\d{4}|[A-Z]{3}\d[A-Z]\d{2})\b/i;

export function createMapLocation(fields) {
  const { latitude, longitude } = fields;
  if (
    typeof latitude !== "string" || !latitude.trim() ||
    typeof longitude !== "string" || !longitude.trim()
  ) {
    return null;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
      Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  const bounds = [
    Math.max(-180, lon - 0.015),
    Math.max(-90, lat - 0.01),
    Math.min(180, lon + 0.015),
    Math.min(90, lat + 0.01),
  ];
  const embed = new URL("https://www.openstreetmap.org/export/embed.html");
  embed.searchParams.set("bbox", bounds.join(","));
  embed.searchParams.set("layer", "mapnik");
  embed.searchParams.set("marker", `${lat},${lon}`);
  const external = new URL("https://www.openstreetmap.org/");
  external.searchParams.set("mlat", String(lat));
  external.searchParams.set("mlon", String(lon));
  external.hash = `map=16/${lat}/${lon}`;
  return { embedUrl: embed.href, externalUrl: external.href };
}

function isValidDateTime(dateText, timeText) {
  const [day, month, year] = dateText.split(/[/-]/).map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

export function extractFields(text) {
  const fields = {};

  for (const match of text.matchAll(DATE_TIME)) {
    if (isValidDateTime(match.groups.date, match.groups.time)) {
      fields.data = match.groups.date;
      fields.hora = match.groups.time;
      break;
    }
  }

  for (const match of text.matchAll(COORDINATES)) {
    const latitude = Number(match.groups.latitude);
    const longitude = Number(match.groups.longitude);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      fields.latitude = match.groups.latitude;
      fields.longitude = match.groups.longitude;
      break;
    }
  }

  const plateMatch = text.match(PLATE);
  if (plateMatch) {
    fields.placa = plateMatch[0].toUpperCase();
  }

  return fields;
}
