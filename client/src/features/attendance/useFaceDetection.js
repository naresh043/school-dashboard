import { useCallback, useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_PATH = "/models/blaze_face_short_range.tflite";
const WASM_PATH = "/mediapipe/wasm";
const DETECTION_INTERVAL_MS = 120;
const STARTUP_TIMEOUT_MS = 20000;

/** @typedef {"idle" | "requesting-permission" | "initializing-model" | "scanning" | "face-detected" | "no-face-detected" | "error"} DetectionStatus */

function friendlyCameraError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera access was denied. Allow camera access in your browser settings, then try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found. Connect a camera and try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera could not start. It may already be in use by another app.";
    case "SecurityError":
      return "The browser blocked camera access for security reasons. Open this page over HTTPS.";
    case "OverconstrainedError":
      return "The requested camera is unavailable. Check your camera settings and try again.";
    default:
      return "The camera could not be started. Check your browser permissions and try again.";
  }
}

function withTimeout(promise, message, timeoutMs = STARTUP_TIMEOUT_MS) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => window.clearTimeout(timeoutId));
}

function waitForVideo(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return withTimeout(new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("The camera preview could not be loaded.")); };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  }), "The camera preview did not become ready. Check that the camera is connected and try again.", 12000);
}

function diagnose(message, error) {
  if (import.meta.env.DEV) console.error(`[Face attendance] ${message}`, error);
}

export default function useFaceDetection() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(0);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const startPendingRef = useRef(false);
  const detectionBusyRef = useRef(false);
  const lastDetectionAtRef = useRef(0);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [detections, setDetections] = useState([]);
  const [faceCount, setFaceCount] = useState(0);
  const [startPending, setStartPending] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const pendingCountRef = useRef(null);
  const pendingCountSinceRef = useRef(0);
  const publishedCountRef = useRef(0);
  const publishedStatusRef = useRef(null);

  const stopCamera = useCallback((nextStatus = "idle", message = "") => {
    generationRef.current += 1;
    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;
    detectionBusyRef.current = false;
    lastDetectionAtRef.current = 0;
    pendingCountRef.current = null;
    pendingCountSinceRef.current = 0;
    publishedCountRef.current = 0;
    publishedStatusRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current?.close();
    detectorRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setDetections([]);
      setFaceCount(0);
      setPreviewSize({ width: 0, height: 0 });
      setErrorMessage(message);
      setStatus(nextStatus);
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (startPendingRef.current) return;
    if (status === "requesting-permission" || status === "initializing-model" || status === "scanning" || status === "face-detected" || status === "no-face-detected") return;
    if (!window.isSecureContext) {
      setErrorMessage("Camera access requires a secure connection. Open this page over HTTPS or localhost.");
      setStatus("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("This browser does not support camera access. Try a recent version of Chrome, Edge, Safari, or Firefox.");
      setStatus("error");
      return;
    }

    const generation = ++generationRef.current;
    startPendingRef.current = true;
    setStartPending(true);
    setErrorMessage("");
    setDetections([]);
    setFaceCount(0);
    setPreviewSize({ width: 0, height: 0 });
    pendingCountRef.current = null;
    pendingCountSinceRef.current = 0;
    publishedCountRef.current = 0;
    publishedStatusRef.current = null;
    setStatus("requesting-permission");

    let startupStage = "camera";
    try {
      const cameraRequest = navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      let stream;
      try {
        stream = await withTimeout(cameraRequest, "Camera permission request took too long. Check your browser permission prompt and try again.", 30000);
      } catch (error) {
        cameraRequest.then((lateStream) => lateStream.getTracks().forEach((track) => track.stop())).catch(() => {});
        throw error;
      }
      if (!mountedRef.current || generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("The camera preview is unavailable.");
      video.srcObject = stream;
      await video.play();
      await waitForVideo(video);
      if (!mountedRef.current || generation !== generationRef.current) return;
      setPreviewSize({ width: video.videoWidth, height: video.videoHeight });
      setStatus("initializing-model");
      startupStage = "model";

      const detectorPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        return FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });
      })();
      let detector;
      try {
        detector = await withTimeout(detectorPromise, "Face detection took too long to initialize. Check your connection and try again.");
      } catch (error) {
        detectorPromise.then((lateDetector) => lateDetector.close()).catch(() => {});
        throw error;
      }
      if (!mountedRef.current || generation !== generationRef.current) {
        detector.close();
        return;
      }
      detectorRef.current = detector;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (generation === generationRef.current && mountedRef.current) {
            stopCamera("error", "The camera stream ended unexpectedly. Start the camera again to continue.");
          }
        }, { once: true });
      });

      const detect = (timestamp) => {
        if (!mountedRef.current || generation !== generationRef.current) return;
        animationFrameRef.current = window.requestAnimationFrame(detect);
        if (timestamp - lastDetectionAtRef.current < DETECTION_INTERVAL_MS || detectionBusyRef.current) return;
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return;
        lastDetectionAtRef.current = timestamp;
        detectionBusyRef.current = true;
        try {
          const result = detector.detectForVideo(video, timestamp);
          if (!mountedRef.current || generation !== generationRef.current) return;
          const nextDetections = result.detections || [];
          setDetections(nextDetections);
          const nextCount = nextDetections.length;
          if (pendingCountRef.current !== nextCount) {
            pendingCountRef.current = nextCount;
            pendingCountSinceRef.current = timestamp;
          } else if (timestamp - pendingCountSinceRef.current >= 240) {
            const nextStatus = nextCount > 0 ? "face-detected" : "no-face-detected";
            if (publishedCountRef.current !== nextCount) {
              publishedCountRef.current = nextCount;
              setFaceCount(nextCount);
            }
            if (publishedStatusRef.current !== nextStatus) {
              publishedStatusRef.current = nextStatus;
              setStatus(nextStatus);
            }
          }
        } catch (error) {
          diagnose("Face detection failed", error);
          stopCamera("error", "Face detection stopped unexpectedly. Stop and start the camera to try again.");
        } finally {
          detectionBusyRef.current = false;
        }
      };
      setStatus("scanning");
      animationFrameRef.current = window.requestAnimationFrame(detect);
    } catch (error) {
      diagnose("Camera initialization failed", error);
      if (generation === generationRef.current && mountedRef.current) {
        const message = error?.message?.includes("too long") || error?.message?.includes("ready")
          ? error.message
          : error?.message?.includes("Failed to fetch") || error?.message?.includes("model") || error?.message?.includes("wasm")
            ? "The face-detection model could not be loaded. Check that the app assets are available, then try again."
            : startupStage === "model"
              ? "Face detection could not be initialized. Check that the model and MediaPipe runtime files are available, then try again."
            : error?.name ? friendlyCameraError(error) : "Face detection could not be initialized. Stop and start the camera to try again.";
        stopCamera("error", message);
      }
    } finally {
      startPendingRef.current = false;
      if (mountedRef.current) setStartPending(false);
    }
  }, [status, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startPendingRef.current = false;
      generationRef.current += 1;
      window.cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, []);

  return { videoRef, status, errorMessage, detections, faceCount, previewSize, startPending, startCamera, stopCamera };
}
