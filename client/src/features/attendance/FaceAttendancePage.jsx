import { AlertCircle, Camera, CircleHelp, CircleStop, ScanFace, ShieldCheck, Wifi } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import useFaceDetection from "./useFaceDetection.js";

const statusLabels = {
  idle: "Camera is off",
  "requesting-permission": "Waiting for camera permission",
  "initializing-model": "Preparing local face detection",
  scanning: "Camera active · scanning",
  "face-detected": "Face detected",
  "no-face-detected": "No face detected",
  error: "Camera unavailable",
};

export default function FaceAttendancePage() {
  const { videoRef, status, errorMessage, detections, faceCount, previewSize, startPending, startCamera, stopCamera } = useFaceDetection();
  const cameraActive = ["requesting-permission", "initializing-model", "scanning", "face-detected", "no-face-detected"].includes(status);

  return (
    <AppShell title="Face Attendance" subtitle="Camera-based face detection prototype">
      <section className="attendance-notice" aria-label="Prototype scope">
        <ShieldCheck size={20} aria-hidden="true" />
        <p><b>Phase 1: Face detection only.</b> Student identification and attendance recording are not enabled.</p>
      </section>

      <div className="attendance-layout">
        <section className="attendance-camera-card" aria-label="Camera preview">
          <div className="attendance-card-heading">
            <div><p className="eyebrow">LIVE PREVIEW</p><h2>Camera</h2></div>
            <span className={`attendance-state-pill ${cameraActive ? "is-active" : ""}`}>
              <span aria-hidden="true" className="attendance-state-dot" />{statusLabels[status]}
            </span>
          </div>

          <div className={`camera-stage ${cameraActive ? "camera-stage-active" : ""}`}>
            <video ref={videoRef} className="camera-video" muted playsInline aria-label="Live camera preview" />
            {previewSize.width > 0 && previewSize.height > 0 && (
              <svg className="face-box-overlay" viewBox={`0 0 ${previewSize.width} ${previewSize.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {detections.map((detection, index) => {
                  const box = detection.boundingBox;
                  if (!box) return null;
                  return <rect key={index} x={previewSize.width - box.originX - box.width} y={box.originY} width={box.width} height={box.height} rx="12" />;
                })}
              </svg>
            )}
            {!cameraActive && (
              <div className="camera-empty-state">
                <span className="camera-empty-icon"><Camera size={29} /></span>
                <b>Camera preview is off</b>
                <span>Select Start Camera when you are ready.</span>
              </div>
            )}
            {cameraActive && (status === "requesting-permission" || status === "initializing-model") && (
              <div className="camera-loading-state" role="status"><span className="camera-spinner" />{statusLabels[status]}…</div>
            )}
          </div>

          {errorMessage && <div className="attendance-error" role="alert"><AlertCircle size={18} /><span>{errorMessage}</span></div>}

          <div className="camera-controls">
            <button className="primary-button" type="button" onClick={startCamera} disabled={cameraActive || startPending}>
              <Camera size={17} /> Start Camera
            </button>
            <button className="attendance-stop-button" type="button" onClick={() => stopCamera()} disabled={!cameraActive}>
              <CircleStop size={17} /> Stop Camera
            </button>
          </div>
          {startPending && status === "idle" && <p className="camera-pending-note">Finishing the previous camera request. Wait for the browser permission prompt to resolve before trying again.</p>}
        </section>

        <aside className="attendance-side-column">
          <section className="attendance-status-card" aria-labelledby="detection-heading">
            <div className="attendance-card-heading">
              <div><p className="eyebrow">DETECTION</p><h2 id="detection-heading">Face status</h2></div>
              <span className={`detection-icon ${status === "face-detected" ? "detection-icon-found" : ""}`}><ScanFace size={20} /></span>
            </div>
            <p className="detection-status-text" role="status" aria-live="polite" aria-atomic="true">
              {status === "face-detected" ? "Face detected. Student identity has not been verified." : status === "no-face-detected" ? "No face detected. Position your face in front of the camera." : status === "error" ? "Detection is unavailable until the camera is restarted." : status === "scanning" ? "Scanning the live preview for faces." : status === "initializing-model" ? "Loading the local face-detection model." : status === "requesting-permission" ? "Camera permission is needed to show the live preview." : "Start the camera to begin local face detection."}
            </p>
            <div className="face-count-row"><span>Faces in current frame</span><b>{faceCount}</b></div>
            <p className="detection-limit-note"><CircleHelp size={15} /> A detected face is not verified as a student.</p>
          </section>

          <section className="attendance-status-card instructions-card" aria-labelledby="position-heading">
            <div className="attendance-card-heading">
              <div><p className="eyebrow">GETTING STARTED</p><h2 id="position-heading">Position for detection</h2></div>
            </div>
            <ol className="attendance-instructions">
              <li><span>1</span><p>Allow camera access when your browser asks.</p></li>
              <li><span>2</span><p>Place one or more faces in view, facing the camera.</p></li>
              <li><span>3</span><p>Use Stop Camera when you are finished.</p></li>
            </ol>
            <p className="local-processing-note"><Wifi size={15} /> Frames are processed locally and are not uploaded or saved.</p>
          </section>
        </aside>
      </div>

      <p className="attendance-privacy-note">Camera access works on HTTPS or localhost. This prototype does not identify people or create attendance records.</p>
    </AppShell>
  );
}
