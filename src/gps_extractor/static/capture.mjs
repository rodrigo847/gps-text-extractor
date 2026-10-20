import {
  calculateCaptureCrop,
  calculateOcrEnhancement,
  extractPlateCandidates,
  normalizePlate,
  validateCapturePosition,
  waitForCapturePosition,
  withTimeout,
} from "./capture-data.mjs";

const OCR_STEP_TIMEOUT_MS = 60000;

export function initializeCapture({ onInvalidate, onConfirm }) {
  const video = document.querySelector("#camera-preview");
  const canvas = document.querySelector("#photo-preview");
  const startButton = document.querySelector("#start-camera");
  const captureButton = document.querySelector("#capture-photo");
  const cameraView = document.querySelector("#camera-view");
  const cameraFeed = document.querySelector(".camera-feed");
  const captureLabel = document.querySelector("#capture-label");
  const stopButton = document.querySelector("#stop-camera");
  const torchButton = document.querySelector("#camera-torch");
  const clearButton = document.querySelector("#clear-photo");
  const status = document.querySelector("#capture-status");
  const review = document.querySelector("#photo-review");
  const plateInput = document.querySelector("#photo-plate");
  const rawText = document.querySelector("#ocr-text");
  const locationInfo = document.querySelector("#photo-location");
  const confirmForm = document.querySelector("#confirm-photo");
  const approved = document.querySelector("#confirm-location");
  const zoomControl = document.querySelector("#camera-zoom");
  const zoomInput = document.querySelector("#zoom-level");
  const zoomValue = document.querySelector("#zoom-value");
  const zoomHelp = document.querySelector("#zoom-help");
  let stream = null;
  let record = null;
  let busy = false;
  let active = true;
  let operationId = 0;
  let locationRequest = null;
  let torchEnabled = false;

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
    torchButton.hidden = true;
    torchButton.textContent = "Ativar lanterna";
    torchButton.setAttribute("aria-pressed", "false");
    torchEnabled = false;
    startButton.hidden = false;
    zoomControl.hidden = true;
  }

  torchButton.addEventListener("click", async () => {
    if (busy || !stream) return;
    const track = stream.getVideoTracks()[0];
    const operation = operationId;
    const nextEnabled = !torchEnabled;
    busy = true;
    torchButton.disabled = true;
    captureButton.disabled = true;
    zoomInput.disabled = true;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextEnabled }] });
      if (!isCurrent(operation) || stream?.getVideoTracks()[0] !== track) return;
      torchEnabled = nextEnabled;
      torchButton.textContent = torchEnabled ? "Desativar lanterna" : "Ativar lanterna";
      torchButton.setAttribute("aria-pressed", String(torchEnabled));
      notify(torchEnabled ? "Lanterna ativada." : "Lanterna desativada.");
    } catch (error) {
      if (isCurrent(operation)) {
        notify(`O aparelho não conseguiu ajustar a lanterna: ${error.message}.`, true);
      }
    } finally {
      if (isCurrent(operation)) {
        busy = false;
        torchButton.disabled = false;
        captureButton.disabled = false;
        zoomInput.disabled = false;
      }
    }
  });

  zoomInput.addEventListener("change", async () => {
    if (busy || !stream) return;
    const track = stream.getVideoTracks()[0];
    const operation = operationId;
    busy = true;
    torchButton.disabled = true;
    zoomInput.disabled = true;
    captureButton.disabled = true;
    try {
      await track.applyConstraints({ advanced: [{ zoom: Number(zoomInput.value) }] });
      if (!isCurrent(operation) || stream?.getVideoTracks()[0] !== track) return;
      const actualZoom = track.getSettings().zoom ?? Number(zoomInput.value);
      zoomInput.value = String(actualZoom);
      zoomValue.textContent = `${Number(actualZoom).toFixed(1)}×`;
    } catch (error) {
      if (isCurrent(operation)) {
        zoomInput.value = String(track.getSettings().zoom ?? zoomInput.min);
        zoomValue.textContent = `${Number(zoomInput.value).toFixed(1)}×`;
        notify(`O aparelho não conseguiu ajustar o zoom: ${error.message}. Continue sem se aproximar.`, true);
      }
    } finally {
      if (isCurrent(operation)) {
        busy = false;
        torchButton.disabled = false;
        zoomInput.disabled = false;
        captureButton.disabled = false;
      }
    }
  });

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
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
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
      const track = stream.getVideoTracks()[0];
      const zoom = track.getCapabilities?.().zoom;
      const supportsTorch = track.getCapabilities?.().torch === true;
      const supportsZoom = Number.isFinite(zoom?.min) && Number.isFinite(zoom?.max) &&
        zoom.max > zoom.min;
      zoomControl.hidden = !supportsZoom;
      torchButton.hidden = !supportsTorch;
      zoomHelp.textContent = supportsZoom
        ? "Zoom do aparelho: ajuste sem sair de um local seguro. Pode ser digital."
        : "Zoom não disponível neste navegador. Se a placa não estiver legível, não se aproxime.";
      if (supportsZoom) {
        zoomInput.min = String(zoom.min);
        zoomInput.max = String(zoom.max);
        zoomInput.step = String(zoom.step > 0 ? zoom.step : 0.1);
        zoomInput.value = String(track.getSettings().zoom ?? zoom.min);
        zoomValue.textContent = `${Number(zoomInput.value).toFixed(1)}×`;
      }
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
    torchButton.disabled = true;
    zoomInput.disabled = true;
    captureLabel.textContent = "Obtendo GPS…";
    cameraView.setAttribute("aria-busy", "true");
    stopButton.disabled = true;
    clearPhoto();
    let worker = null;
    try {
      notify("Obtendo a posição atual do aparelho. Mantenha a placa enquadrada...");
      locationRequest = new AbortController();
      const position = await waitForCapturePosition(navigator.geolocation, {
        signal: locationRequest.signal,
        onWaiting() {
          if (isCurrent(operation)) {
            notify("Atualizando o GPS… Mantenha a placa enquadrada. Isso pode levar até 25 segundos.");
          }
        },
      });
      if (!isCurrent(operation)) return;
      const capturedAt = Date.now();
      const location = validateCapturePosition(position, capturedAt);
      if (!stream?.getVideoTracks().some((track) => track.readyState === "live") ||
          !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        throw new Error("A câmera ainda não tem uma imagem disponível. Tente novamente.");
      }
      const crop = calculateCaptureCrop(
        video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight,
      );
      canvas.width = crop.outputWidth;
      canvas.height = crop.outputHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu preparar a foto.");
      context.drawImage(video,
        crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let luminance = 0;
      let samples = 0;
      for (let index = 0; index < pixels.length; index += 64) {
        luminance += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] +
          0.0722 * pixels[index + 2];
        samples += 1;
      }
      const enhancement = calculateOcrEnhancement(luminance / samples);
      const ocrCanvas = document.createElement("canvas");
      ocrCanvas.width = canvas.width;
      ocrCanvas.height = canvas.height;
      const ocrContext = ocrCanvas.getContext("2d");
      if (!ocrContext) throw new Error("O navegador não conseguiu preparar a leitura da foto.");
      ocrContext.filter =
        `brightness(${enhancement.brightness}) contrast(${enhancement.contrast})`;
      ocrContext.drawImage(canvas, 0, 0);
      record = { ...location, capturedAt };
      stopCamera();
      startButton.disabled = true;
      review.hidden = false;
      review.scrollIntoView({ block: "start", behavior: "instant" });
      clearButton.disabled = true;
      confirmForm.querySelector("button").disabled = true;
      locationInfo.textContent =
        `GPS do aparelho: ${location.latitude}, ${location.longitude}. ` +
        `Precisão estimada: ±${Math.round(location.accuracy)} m. ` +
        `Captura: ${new Date(capturedAt).toLocaleString("pt-BR")}.`;
      notify("Carregando o motor OCR no aparelho. O primeiro uso pode levar alguns instantes...");
      const { default: Tesseract } = await withTimeout(
        import("https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js"),
        OCR_STEP_TIMEOUT_MS,
        "O download do OCR demorou mais de 60 segundos. Confira a conexão e tente novamente; você pode digitar a placa manualmente.",
      );
      if (!isCurrent(operation)) return;
      const workerCreation = Tesseract.createWorker("eng", 1, {
        logger: (progress) => {
          if (!isCurrent(operation)) return;
          if (progress.status === "recognizing text") {
            notify(`Lendo a placa: ${Math.round(progress.progress * 100)}%...`);
          } else if (progress.status) {
            notify(`Preparando OCR: ${progress.status}...`);
          }
        },
      });
      const workerTimeoutMessage =
        "A preparação do OCR demorou mais de 60 segundos. Confira a conexão e tente novamente; você pode digitar a placa manualmente.";
      try {
        worker = await withTimeout(workerCreation, OCR_STEP_TIMEOUT_MS, workerTimeoutMessage);
      } catch (error) {
        if (error.message === workerTimeoutMessage) {
          void workerCreation.then(async (lateWorker) => {
            try {
              await lateWorker.terminate();
            } catch (terminationError) {
              if (isCurrent(operation)) {
                notify(`Erro ao encerrar o OCR: ${terminationError.message}. Recarregue a página antes de continuar.`, true);
              }
            }
          }, (creationError) => {
            if (isCurrent(operation)) {
              notify(`Falha ao preparar o OCR: ${creationError.message}. Digite a placa manualmente.`, true);
            }
          });
        }
        throw error;
      }
      if (!isCurrent(operation)) return;
      await withTimeout(worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ",
        tessedit_pageseg_mode: "7",
      }), OCR_STEP_TIMEOUT_MS, "O OCR não respondeu ao preparar a leitura em 60 segundos. Você pode digitar a placa manualmente.");
      const result = await withTimeout(
        worker.recognize(ocrCanvas),
        OCR_STEP_TIMEOUT_MS,
        "A leitura do OCR demorou mais de 60 segundos. Confira a foto e digite a placa manualmente.",
      );
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
        locationRequest = null;
        busy = false;
        captureButton.disabled = false;
        torchButton.disabled = false;
        zoomInput.disabled = false;
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
    locationRequest?.abort();
    locationRequest = null;
    stopCamera();
    clearPhoto();
    busy = false;
    captureLabel.textContent = "Tirar foto";
    cameraView.removeAttribute("aria-busy");
    for (const button of [
      startButton, captureButton, stopButton, torchButton, clearButton, zoomInput,
    ]) {
      button.disabled = false;
    }
  });
  window.addEventListener("pageshow", () => {
    active = true;
  });
}
