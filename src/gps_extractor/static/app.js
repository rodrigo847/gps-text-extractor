import { createMapLocation, extractFields } from "./parser.mjs";
import { initializeCapture } from "./capture.mjs";

const form = document.querySelector("#extract-form");
const textInput = document.querySelector("#source-text");
const charCount = document.querySelector("#char-count");
const results = document.querySelector("#results");
const resultList = document.querySelector("#result-list");
const resultCount = document.querySelector("#result-count");
const statusMessage = document.querySelector("#status-message");
const analyzeButton = form.querySelector("button[type='submit']");
const sendApiButton = document.querySelector("#send-api");
const mapSection = document.querySelector("#map-section");
const mapCaption = document.querySelector("#map-caption");
const loadMapButton = document.querySelector("#load-map");
const mapFrame = document.querySelector("#location-map");
const mapHelp = document.querySelector("#map-help");
const externalMap = document.querySelector("#external-map");
let mapLocation = null;

function resetMap() {
  mapLocation = null;
  mapCaption.textContent = "";
  mapFrame.removeAttribute("src");
  mapFrame.hidden = true;
  mapSection.hidden = true;
  mapHelp.hidden = true;
  externalMap.removeAttribute("href");
  loadMapButton.hidden = false;
}

function prepareMap(fields, sourceMessage) {
  resetMap();
  mapLocation = createMapLocation(fields);
  if (!mapLocation) {
    return;
  }
  mapCaption.textContent = [
    fields.placa ? `Placa informada: ${fields.placa}` : "Placa não informada",
    `Coordenadas: ${fields.latitude}, ${fields.longitude}`,
    [fields.data, fields.hora].filter(Boolean).join(" "),
    sourceMessage,
  ].filter(Boolean).join(" · ");
  mapSection.hidden = false;
}

loadMapButton.addEventListener("click", () => {
  if (!mapLocation) {
    return;
  }
  mapFrame.src = mapLocation.embedUrl;
  externalMap.href = mapLocation.externalUrl;
  mapFrame.hidden = false;
  mapHelp.hidden = false;
  loadMapButton.hidden = true;
});

const labels = {
  data: "Data",
  hora: "Horário",
  latitude: "Latitude",
  longitude: "Longitude",
  placa: "Placa",
};

function updateCharacterCount() {
  const count = textInput.value.length;
  charCount.textContent = `${count} ${count === 1 ? "caractere" : "caracteres"}`;
}

function renderFields(fields, message, sourceMessage) {
  prepareMap(fields, sourceMessage);
  resultList.replaceChildren();
  const entries = Object.entries(fields);

  if (entries.length === 0) {
    results.hidden = true;
    statusMessage.textContent =
      message ?? "Nenhum campo reconhecido. Confira o texto ou experimente outro formato.";
    statusMessage.classList.remove("error");
    return;
  }

  for (const [key, value] of entries) {
    const item = document.createElement("div");
    item.className = "result-item";

    const label = document.createElement("span");
    label.className = "result-label";
    label.textContent = labels[key] ?? key;

    const resultValue = document.createElement("span");
    resultValue.className = "result-value";
    resultValue.textContent = value;

    item.append(label, resultValue);
    resultList.append(item);
  }

  resultCount.textContent = `${entries.length} ${entries.length === 1 ? "campo" : "campos"}`;
  results.hidden = false;
  statusMessage.textContent = message ?? "Análise concluída no navegador.";
  statusMessage.classList.remove("error");
}

textInput.addEventListener("input", () => {
  updateCharacterCount();
  resetMap();
  results.hidden = true;
  statusMessage.textContent = "Texto alterado. Analise novamente para atualizar os resultados.";
  statusMessage.classList.remove("error");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    renderFields(extractFields(textInput.value));
  } catch (error) {
    resetMap();
    statusMessage.textContent =
      error instanceof Error ? error.message : "Falha ao analisar o texto.";
    statusMessage.classList.add("error");
    results.hidden = true;
  }
});

sendApiButton.addEventListener("click", async () => {
  sendApiButton.disabled = true;
  analyzeButton.disabled = true;
  textInput.disabled = true;
  resetMap();
  results.hidden = true;
  statusMessage.textContent = "Enviando texto ao backend local...";
  statusMessage.classList.remove("error");

  try {
    const response = await fetch("./api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: "demo-web", text: textInput.value }),
    });
    if (!response.ok) {
      throw new Error(`Backend respondeu HTTP ${response.status}.`);
    }
    const payload = await response.json();
    renderFields(payload.fields, payload.message ?? "Resposta recebida do backend.");
  } catch (error) {
    resetMap();
    statusMessage.textContent =
      error instanceof Error
        ? `${error.message} Inicie o servidor Python local para testar a API.`
        : "Falha ao conectar ao backend local.";
    statusMessage.classList.add("error");
    results.hidden = true;
  } finally {
    sendApiButton.disabled = false;
    analyzeButton.disabled = false;
    textInput.disabled = false;
  }
});

updateCharacterCount();

initializeCapture({
  onInvalidate() {
    resetMap();
    results.hidden = true;
    resultList.replaceChildren();
    resultCount.textContent = "";
    statusMessage.textContent = "Protótipo independente. Não envia denúncias às autoridades.";
    statusMessage.classList.remove("error");
  },
  onConfirm(fields, sourceMessage) {
    renderFields(fields, "Foto e localização revisadas pelo usuário.", sourceMessage);
  },
});
