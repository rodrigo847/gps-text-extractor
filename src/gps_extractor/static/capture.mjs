import {
  buildPhotoEmailUrl,
  calculatePhotoSize,
  MAX_CAPTURE_ACCURACY_METERS,
  validateCapturePosition,
  waitForCapturePosition,
} from "./capture-data.mjs?v=20261020-gps-accuracy";

export function initializeCapture({ onInvalidate, onLocation }) {
  const video = document.querySelector("#camera-preview");
  const canvas = document.querySelector("#photo-preview");
  const startButton = document.querySelector("#start-camera");
  const captureButton = document.querySelector("#capture-photo");
  const cameraView = document.querySelector("#camera-view");
  const captureLabel = document.querySelector("#capture-label");
  const stopButton = document.querySelector("#stop-camera");
  const clearButton = document.querySelector("#clear-photo");
  const status = document.querySelector("#capture-status");
  const review = document.querySelector("#photo-review");
  const locationInfo = document.querySelector("#photo-location");
  const downloadButton = document.querySelector("#download-photo");
  const emailButton = document.querySelector("#email-photo");
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
    zoomControl.hidden = true;
  }

  zoomInput.addEventListener("change", async () => {
    if (busy || !stream) return;
    const track = stream.getVideoTracks()[0];
    const operation = operationId;
    busy = true;
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
    locationInfo.textContent = "";
    downloadButton.disabled = true;
    emailButton.disabled = true;
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
      const supportsZoom = Number.isFinite(zoom?.min) && Number.isFinite(zoom?.max) &&
        zoom.max > zoom.min;
      zoomControl.hidden = !supportsZoom;
      zoomHelp.textContent = supportsZoom
        ? "Zoom do aparelho: ajuste sem sair de um local seguro. Pode ser digital."
        : "Zoom não disponível neste navegador. Se a imagem não estiver nítida, não se aproxime.";
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
      notify("Enquadre a foto e capture. A localização será solicitada nesse momento.");
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
    operationId += 1;
    locationRequest?.abort();
    locationRequest = null;
    busy = false;
    clearPhoto();
    captureButton.disabled = false;
    zoomInput.disabled = false;
    captureLabel.textContent = "Tirar foto";
    cameraView.removeAttribute("aria-busy");
    stopButton.disabled = false;
    startButton.disabled = false;
    clearButton.disabled = false;
    notify("Foto e localização descartadas desta sessão.");
  });

  captureButton.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    const operation = ++operationId;
    captureButton.disabled = true;
    zoomInput.disabled = true;
    captureLabel.textContent = "Capturando...";
    cameraView.setAttribute("aria-busy", "true");
    stopButton.disabled = true;
    clearPhoto();
    try {
      const capturedAt = Date.now();
      if (!stream?.getVideoTracks().some((track) => track.readyState === "live") ||
          !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        throw new Error("A câmera ainda não tem uma imagem disponível. Tente novamente.");
      }
      const photoSize = calculatePhotoSize(video.videoWidth, video.videoHeight);
      canvas.width = photoSize.width;
      canvas.height = photoSize.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu preparar a foto.");
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
        0, 0, canvas.width, canvas.height);
      record = { capturedAt, captureId: operation };
      stopCamera();
      startButton.disabled = true;
      review.hidden = false;
      review.scrollIntoView({ block: "start", behavior: "instant" });
      downloadButton.disabled = false;
      emailButton.disabled = true;
      clearButton.disabled = false;
      locationInfo.textContent = "Obtendo a posição do aparelho...";
      notify("Foto capturada. Atualizando o GPS...");

      locationRequest = new AbortController();
      try {
        const position = await waitForCapturePosition(navigator.geolocation, {
          signal: locationRequest.signal,
          onWaiting({ reason, position } = {}) {
            if (isCurrent(operation)) {
              if (reason === "accuracy" && position) {
                notify(
                  `A foto já foi capturada. GPS com precisão estimada de ±${Math.round(position.coords.accuracy)} m; aguardando uma leitura de até ±${MAX_CAPTURE_ACCURACY_METERS} m.`,
                );
              } else {
                notify("A foto já foi capturada. Atualizando o GPS; isso pode levar até 25 segundos.");
              }
            }
          },
        });
        if (!isCurrent(operation)) return;
        const location = validateCapturePosition(position, capturedAt);
        record = { ...location, capturedAt, captureId: operation };
        locationInfo.textContent =
          `GPS do aparelho: ${location.latitude}, ${location.longitude}. ` +
          `Precisão estimada: ±${Math.round(location.accuracy)} m. ` +
          `Captura: ${new Date(capturedAt).toLocaleString("pt-BR")}.`;
        emailButton.disabled = false;
        onLocation?.({ ...location, capturedAt });
        notify("Foto e localização prontas. Baixe a foto e prepare o e-mail.");
      } catch (error) {
        if (!isCurrent(operation)) return;
        locationInfo.textContent = `GPS não associado: ${error.message}`;
        notify(`Foto salva, mas não foi possível obter um GPS recente: ${error.message}`, true);
      }
    } catch (error) {
      if (!isCurrent(operation)) return;
      if (record) {
        notify(`Foto capturada, mas houve uma falha ao obter a localização: ${error.message}.`, true);
      } else {
        notify(`Captura cancelada: ${error.message}.`, true);
      }
    } finally {
      if (operation === operationId) {
        locationRequest = null;
        busy = false;
        captureButton.disabled = false;
        zoomInput.disabled = false;
        captureLabel.textContent = "Tirar foto";
        cameraView.removeAttribute("aria-busy");
        stopButton.disabled = false;
        startButton.disabled = false;
        clearButton.disabled = false;
      }
    }
  });

  downloadButton.addEventListener("click", async () => {
    if (!record) return;
    const captureId = record.captureId;
    const capturedAt = record.capturedAt;
    downloadButton.disabled = true;
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("O navegador não conseguiu preparar o arquivo da foto."));
        }, "image/jpeg", 0.92);
      });
      if (!record || record.captureId !== captureId) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = blob.type === "image/jpeg" ? "jpg" : "png";
      link.download =
        `foto-${new Date(capturedAt).toISOString().replaceAll(":", "-")}.${extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Foto baixada. Anexe esse arquivo ao e-mail preparado.");
    } catch (error) {
      notify(`Não foi possível baixar a foto: ${error.message}`, true);
    } finally {
      downloadButton.disabled = !record;
    }
  });

  emailButton.addEventListener("click", () => {
    if (!record || !Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) return;
    window.location.href = buildPhotoEmailUrl(record);
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
    for (const button of [startButton, captureButton, stopButton, clearButton, zoomInput]) {
      button.disabled = false;
    }
  });
  window.addEventListener("pageshow", () => {
    active = true;
  });
}
