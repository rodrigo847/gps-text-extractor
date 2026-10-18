import { extractPlateCandidates, validateCapturePosition, normalizePlate } from "./capture-data.mjs";

export function initializeCapture({ onInvalidate, onConfirm }) {
  const video = document.querySelector("#camera-preview");
  const canvas = document.querySelector("#photo-preview");
  const startButton = document.querySelector("#start-camera");
  const captureButton = document.querySelector("#capture-photo");
  const cameraView = document.querySelector("#camera-view");
  const cameraFeed = document.querySelector(".camera-feed");
  const captureLabel = document.querySelector("#capture-label");
  const stopButton = document.querySelector("#stop-camera");
  const clearButton = document.querySelector("#clear-photo");
  const status = document.querySelector("#capture-status");
  const review = document.querySelector("#photo-review");
  const plateInput = document.querySelector("#photo-plate");
  const rawText = document.querySelector("#ocr-text");
  const locationInfo = document.querySelector("#photo-location");
  const confirmForm = document.querySelector("#confirm-photo");
  const approved = document.querySelector("#confirm-location");
  let stream = null;
  let record = null;
  let busy = false;
  let active = true;
  let operationId = 0;

  function isCurrent(operation) {
    return active && operation === operationId;
  }

  function notify(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function stopCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    document.querySelector("#camera-view").hidden = true;
    captureButton.hidden = true;
    stopButton.hidden = true;
    startButton.hidden = false;
  }

  function clearPhoto() {
    record = null;
    canvas.width = 0;
    canvas.height = 0;
    review.hidden = true;
    plateInput.value = "";
    rawText.value = "";
    locationInfo.textContent = "";
    approved.checked = false;
    onInvalidate();
  }

  startButton.addEventListener("click", async () => {
    if (busy) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia ||
        !navigator.geolocation) {
      notify("Câmera e localização exigem HTTPS (ou localhost) e um navegador compatível.", true);
      return;
    }
    busy = true;
    const operation = ++operationId;
    startButton.disabled = true;
    clearPhoto();
    notify("Aguardando permissão para abrir a câmera...");
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      if (!isCurrent(operation)) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = camera;
      video.srcObject = stream;
      document.querySelector("#camera-view").hidden = false;
      await video.play();
      if (!isCurrent(operation)) return;
      cameraFeed.style.setProperty("--camera-ratio", video.videoWidth / video.videoHeight);
      startButton.hidden = true;
      captureButton.hidden = false;
      stopButton.hidden = false;
      cameraView.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
      notify("Enquadre somente a placa na faixa destacada e capture. A localização será solicitada nesse momento.");
    } catch (error) {
      if (!isCurrent(operation)) return;
      stopCamera();
      notify(`Não foi possível abrir a câmera: ${error.message}`, true);
    } finally {
      if (operation === operationId) {
        busy = false;
        startButton.disabled = false;
      }
    }
  });

  stopButton.addEventListener("click", () => {
    stopCamera();
    notify("Câmera desligada.");
  });

  clearButton.addEventListener("click", () => {
    clearPhoto();
    notify("Foto, texto OCR e localização descartados desta sessão.");
  });

  captureButton.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    const operation = ++operationId;
    captureButton.disabled = true;
    captureLabel.textContent = "Obtendo GPS…";
    cameraView.setAttribute("aria-busy", "true");
    stopButton.disabled = true;
    clearPhoto();
    let worker = null;
    try {
      notify("Obtendo a posição atual do aparelho. Mantenha a placa enquadrada...");
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, maximumAge: 0, timeout: 20000,
        });
      });
      if (!isCurrent(operation)) return;
      const capturedAt = Date.now();
      const location = validateCapturePosition(position, capturedAt);
      if (!stream?.getVideoTracks().some((track) => track.readyState === "live") ||
          !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        throw new Error("A câmera ainda não tem uma imagem disponível. Tente novamente.");
      }
      const cropWidth = video.videoWidth * 0.9;
      const cropHeight = Math.min(video.videoHeight, cropWidth / 3.2);
      canvas.width = Math.min(1600, Math.round(cropWidth));
      canvas.height = Math.round(canvas.width * cropHeight / cropWidth);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu preparar a foto.");
      context.drawImage(video,
        (video.videoWidth - cropWidth) / 2, (video.videoHeight - cropHeight) / 2,
        cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      record = { ...location, capturedAt };
      stopCamera();
      startButton.disabled = true;
      review.hidden = false;
      clearButton.disabled = true;
      confirmForm.querySelector("button").disabled = true;
      locationInfo.textContent =
        `GPS do aparelho: ${location.latitude}, ${location.longitude}. ` +
        `Precisão estimada: ±${Math.round(location.accuracy)} m. ` +
        `Captura: ${new Date(capturedAt).toLocaleString("pt-BR")}.`;
      notify("Carregando o motor OCR no aparelho. O primeiro uso pode levar alguns instantes...");
      const { default: Tesseract } = await import(
        "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js"
      );
      if (!isCurrent(operation)) return;
      worker = await Tesseract.createWorker("eng", 1, {
        logger: (progress) => {
          if (progress.status === "recognizing text" && isCurrent(operation)) {
            notify(`Lendo a placa: ${Math.round(progress.progress * 100)}%...`);
          }
        },
      });
      if (!isCurrent(operation)) return;
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ",
        tessedit_pageseg_mode: "7",
      });
      const result = await worker.recognize(canvas);
      if (!isCurrent(operation)) return;
      rawText.value = result.data.text;
      const candidates = extractPlateCandidates(result.data.text);
      plateInput.value = candidates.length === 1 ? candidates[0] : "";
      notify(candidates.length === 1
        ? "Leitura concluída. Confira a foto, corrija a placa se necessário e confirme a localização."
        : "OCR concluído, mas não identificou uma placa única válida. Revise a foto e digite a placa; não será feita confirmação automática.");
    } catch (error) {
      if (!isCurrent(operation)) return;
      if (record) {
        notify(`Falha no OCR: ${error.message}. Confira a foto e digite a placa manualmente, ou descarte e repita.`, true);
      } else {
        notify(`Captura cancelada: ${error.message}. A foto não será associada a coordenadas ausentes ou antigas.`, true);
      }
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          if (isCurrent(operation)) {
            notify(`Erro ao encerrar o OCR: ${error.message}. Recarregue a página antes de continuar.`, true);
          }
        }
      }
      if (operation === operationId) {
        busy = false;
        captureButton.disabled = false;
        captureLabel.textContent = "Tirar foto";
        cameraView.removeAttribute("aria-busy");
        stopButton.disabled = false;
        startButton.disabled = false;
        clearButton.disabled = false;
        confirmForm.querySelector("button").disabled = false;
      }
    }
  });

  for (const input of [plateInput, approved]) {
    input.addEventListener("input", onInvalidate);
  }
  confirmForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!record || busy) return;
    const plate = normalizePlate(plateInput.value);
    if (!plate || !approved.checked) {
      notify("Informe uma placa brasileira válida e confirme a origem das coordenadas.", true);
      return;
    }
    plateInput.value = plate;
    onConfirm({
      placa: plate,
      latitude: String(record.latitude),
      longitude: String(record.longitude),
    }, `Foto revisada. GPS do aparelho na captura, precisão estimada ±${Math.round(record.accuracy)} m; ` +
       `${new Date(record.capturedAt).toLocaleString("pt-BR")}. Não comprova a posição do veículo.`);
    notify("Dados revisados. Use Carregar mapa online na seção de resultados para consultar o ponto.");
  });

  window.addEventListener("pagehide", () => {
    active = false;
    operationId += 1;
    stopCamera();
    clearPhoto();
    busy = false;
    captureLabel.textContent = "Tirar foto";
    cameraView.removeAttribute("aria-busy");
    for (const button of [startButton, captureButton, stopButton, clearButton]) {
      button.disabled = false;
    }
  });
  window.addEventListener("pageshow", () => {
    active = true;
  });
}
