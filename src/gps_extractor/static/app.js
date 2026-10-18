import { extractFields } from "./parser.mjs";

const form = document.querySelector("#extract-form");
const textInput = document.querySelector("#source-text");
const charCount = document.querySelector("#char-count");
const results = document.querySelector("#results");
const resultList = document.querySelector("#result-list");
const resultCount = document.querySelector("#result-count");
const statusMessage = document.querySelector("#status-message");
const submitButton = form.querySelector("button[type='submit']");

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

function renderFields(fields) {
  resultList.replaceChildren();
  const entries = Object.entries(fields);

  if (entries.length === 0) {
    results.hidden = true;
    statusMessage.textContent =
      "Nenhum campo reconhecido. Confira o texto ou experimente outro formato.";
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
  statusMessage.textContent = "Análise concluída. Os dados foram processados localmente.";
  statusMessage.classList.remove("error");
}

textInput.addEventListener("input", updateCharacterCount);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  statusMessage.textContent = "Analisando texto...";
  statusMessage.classList.remove("error");

  try {
    renderFields(extractFields(textInput.value));
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : "Falha ao analisar o texto.";
    statusMessage.classList.add("error");
    results.hidden = true;
  } finally {
    submitButton.disabled = false;
  }
});

updateCharacterCount();
