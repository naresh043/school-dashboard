import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Camera, CircleHelp, CircleStop, ScanFace, ShieldCheck, Wifi } from "lucide-react";
import AppShell from "../../components/layout/AppShell.jsx";
import { getApiErrorMessage } from "../../lib/api.js";
import { getClassStudents, getClasses } from "../../services/schoolApi.js";
import useFaceDetection from "./useFaceDetection.js";
import { enrollStudentFace, getFaceRecognitionHealth, getStudentFaceEnrollment, identifyStudentFace, revokeStudentFaceEnrollment, setStudentFaceAuthorization } from "./faceRecognitionApi.js";
import { canEnrollStudent, canIdentifyStudent, canRecordAuthorization, enrollmentResultMessage, getRecognitionUnavailableMessage, isRecognitionReady } from "./faceRecognitionState.js";

async function captureFrame(video) {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth < 320 || video.videoHeight < 240) throw new Error("The camera frame is not ready or has insufficient resolution.");
  const scale = Math.min(1, 1280 / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The camera frame could not be processed.");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  let sumSquares = 0;
  const step = Math.max(4, Math.floor(pixels.length / 12000 / 4) * 4);
  let samples = 0;
  for (let i = 0; i < pixels.length; i += step) {
    const light = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    sum += light;
    sumSquares += light * light;
    samples += 1;
  }
  const average = sum / samples;
  const contrast = Math.sqrt(Math.max(0, sumSquares / samples - average * average));
  if (average < 30 || average > 225 || contrast < 14) throw new Error("The frame looks too dark, too bright, or low contrast. Adjust the lighting and try again.");
  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The camera frame could not be encoded.")), "image/jpeg", 0.88));
  if (blob.size > 2_000_000) throw new Error("The captured image is too large. Move closer to the camera and try again.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  canvas.width = 0;
  canvas.height = 0;
  return { mimeType: "image/jpeg", data: btoa(binary) };
}

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
  const queryClient = useQueryClient();
  const activeRequestRef = useRef(null);
  const [mode, setMode] = useState("enroll");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recognitionResult, setRecognitionResult] = useState(null);
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: getClasses, staleTime: 60000 });
  const classes = classesQuery.data || [];
  const studentsQuery = useQuery({ queryKey: ["face-students", classId], queryFn: () => getClassStudents({ classId, page: 1, limit: 100, sortKey: "rollNumber", sortDirection: "asc", gender: "All" }), enabled: Boolean(classId) });
  const students = useMemo(() => studentsQuery.data?.students || [], [studentsQuery.data]);
  const healthQuery = useQuery({ queryKey: ["face-recognition-health"], queryFn: getFaceRecognitionHealth, retry: false, staleTime: 15000 });
  const enrollmentQuery = useQuery({ queryKey: ["face-enrollment", studentId], queryFn: () => getStudentFaceEnrollment(studentId), enabled: Boolean(studentId), retry: false });
  const selectedStudent = useMemo(() => students.find((student) => student.id === studentId), [students, studentId]);
  const authorizationMutation = useMutation({ mutationFn: () => setStudentFaceAuthorization(studentId, authorizationReference), onSuccess: async () => { setFeedback("Authorization reference recorded. This records a reference to the separately approved authorization; it does not establish consent by itself."); setAuthorizationReference(""); await queryClient.invalidateQueries({ queryKey: ["face-enrollment", studentId] }); }, onError: (error) => setFeedback(getApiErrorMessage(error)) });
  const enrollMutation = useMutation({ mutationFn: async ({ signal }) => enrollStudentFace(studentId, await captureFrame(videoRef.current), signal), onSuccess: async (result) => { try { setFeedback(enrollmentResultMessage(result)); await queryClient.invalidateQueries({ queryKey: ["face-enrollment", studentId] }); } catch (error) { setFeedback(error.message); } }, onError: (error) => setFeedback(error.code === "ERR_CANCELED" ? "Enrollment request cancelled." : getApiErrorMessage(error)), onSettled: () => { activeRequestRef.current = null; } });
  const identifyMutation = useMutation({ mutationFn: async ({ signal }) => identifyStudentFace(classId, await captureFrame(videoRef.current), signal), onSuccess: (result) => { setRecognitionResult(result); setFeedback(""); }, onError: (error) => { setRecognitionResult(error.code === "ERR_CANCELED" ? null : { outcome: "service_unavailable" }); setFeedback(error.code === "ERR_CANCELED" ? "Recognition request cancelled." : getApiErrorMessage(error)); }, onSettled: () => { activeRequestRef.current = null; } });
  const revokeMutation = useMutation({ mutationFn: () => revokeStudentFaceEnrollment(studentId), onSuccess: async () => { setFeedback("Enrollment template deleted and authorization revoked."); await queryClient.invalidateQueries({ queryKey: ["face-enrollment", studentId] }); }, onError: (error) => setFeedback(getApiErrorMessage(error)) });
  const busy = authorizationMutation.isPending || enrollMutation.isPending || identifyMutation.isPending || revokeMutation.isPending;
  const providerReady = isRecognitionReady(healthQuery.data);
  const unavailableMessage = getRecognitionUnavailableMessage(healthQuery.data, healthQuery.isError);
  const captureReady = status === "face-detected" && faceCount === 1;
  const selectStudent = (value) => { setStudentId(value); setFeedback(""); setRecognitionResult(null); };
  const cameraActive = ["requesting-permission", "initializing-model", "scanning", "face-detected", "no-face-detected"].includes(status);

  return (
    <AppShell title="Face Attendance" subtitle="Local face detection and gated identity workflow">
      <section className="attendance-notice" aria-label="Prototype scope">
        <ShieldCheck size={20} aria-hidden="true" />
        <p><b>Face detection is local; identity recognition is separate.</b> Attendance is never recorded by this feature.</p>
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

          <section className="attendance-status-card face-identity-card" aria-labelledby="identity-heading">
            <div className="attendance-card-heading"><div><p className="eyebrow">PHASE 3 · IDENTITY ONLY</p><h2 id="identity-heading">Enrollment & recognition</h2></div><span className="detection-icon"><ShieldCheck size={20} /></span></div>
            {!providerReady && <p className="face-service-status" role="status" aria-live="polite">{unavailableMessage}</p>}
            <div className="face-mode-tabs" role="tablist" aria-label="Face identity mode">
              <button type="button" role="tab" aria-selected={mode === "enroll"} className={mode === "enroll" ? "is-selected" : ""} onClick={() => { setMode("enroll"); setFeedback(""); }}>Enrollment</button>
              <button type="button" role="tab" aria-selected={mode === "recognize"} className={mode === "recognize" ? "is-selected" : ""} onClick={() => { setMode("recognize"); setFeedback(""); }}>Recognition</button>
            </div>
            <label className="face-form-field">Class
              <select value={classId} onChange={(event) => { setClassId(event.target.value); selectStudent(""); }} disabled={busy || classesQuery.isLoading}>
                <option value="">Select a class</option>{classes.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.section}</option>)}
              </select>
            </label>
            {classesQuery.isError && <p className="attendance-error" role="alert">{getApiErrorMessage(classesQuery.error, "Classes could not be loaded.")}</p>}
            {mode === "enroll" ? <>
              <label className="face-form-field">Active student
                <select value={studentId} onChange={(event) => selectStudent(event.target.value)} disabled={!classId || busy || studentsQuery.isLoading}>
                  <option value="">Select a student</option>{students.filter((student) => student.isActive !== false).map((student) => <option key={student.id} value={student.id}>{student.name} · {student.admissionNumber}</option>)}
                </select>
              </label>
              {studentsQuery.isError && <p className="attendance-error" role="alert">{getApiErrorMessage(studentsQuery.error, "Students could not be loaded.")}</p>}
              {selectedStudent && <p className="face-enrollment-status" role="status">{enrollmentQuery.data?.enrollment ? `Template active · ${enrollmentQuery.data.enrollment.modelId}` : enrollmentQuery.data?.authorizationStatus === "authorized" ? "Authorization reference recorded; no template enrolled." : "No authorization reference recorded."}</p>}
              {enrollmentQuery.isError && <p className="attendance-error" role="alert">{getApiErrorMessage(enrollmentQuery.error, "Enrollment status could not be loaded.")}</p>}
              <label className="face-form-field">Approved authorization reference
                <input value={authorizationReference} onChange={(event) => setAuthorizationReference(event.target.value)} maxLength={160} placeholder="Reference to separately approved record" disabled={busy || !studentId || !providerReady} />
              </label>
              <button className="secondary-button face-action-button" type="button" disabled={!canRecordAuthorization(healthQuery.data, studentId, authorizationReference, busy)} title={!providerReady ? "Unavailable while no licensed identity model is configured." : undefined} onClick={() => { setFeedback(""); authorizationMutation.mutate(); }}>Record authorization reference</button>
              <button className="primary-button face-action-button" type="button" disabled={!canEnrollStudent(healthQuery.data, studentId, enrollmentQuery.data?.authorizationStatus === "authorized", captureReady, busy)} title={!providerReady ? "Unavailable while no licensed identity model is configured." : undefined} onClick={() => { const controller = new AbortController(); activeRequestRef.current = controller; setFeedback(""); enrollMutation.mutate({ signal: controller.signal }); }}>{busy ? "Working…" : "Capture & enroll"}</button>
            </> : <button className="primary-button face-action-button" type="button" disabled={!canIdentifyStudent(healthQuery.data, classId, captureReady, busy)} title={!providerReady ? "Unavailable while no licensed identity model is configured." : undefined} onClick={() => { const controller = new AbortController(); activeRequestRef.current = controller; setRecognitionResult(null); identifyMutation.mutate({ signal: controller.signal }); }}>{busy ? "Checking…" : "Capture & identify"}</button>}
            {(enrollMutation.isPending || identifyMutation.isPending) && <button className="attendance-stop-button face-action-button" type="button" onClick={() => activeRequestRef.current?.abort()}>Cancel request</button>}
            <button className="attendance-stop-button face-action-button" type="button" disabled={!studentId || busy || !enrollmentQuery.data?.enrollment} onClick={() => revokeMutation.mutate()}>Revoke and delete enrollment</button>
            {feedback && <p className="face-enrollment-status" role="status">{feedback}</p>}
            {recognitionResult?.outcome === "match" && <p className="face-enrollment-status" role="status">Matched: {recognitionResult.student.name} · {recognitionResult.student.studentCode}</p>}
            {recognitionResult?.outcome === "no_match" && <p className="face-enrollment-status" role="status">No enrolled student matched this frame.</p>}
            {recognitionResult?.outcome === "uncertain" && <p className="face-enrollment-status" role="status">The result is uncertain. No identity is shown.</p>}
            {recognitionResult?.outcome === "service_unavailable" && <p className="attendance-error" role="alert">The recognition service is unavailable. No identity was returned.</p>}
            <p className="detection-limit-note">Capture requires exactly one detected face and a basic local lighting/contrast check. That check is not an identity or liveness check.</p>
          </section>
        </aside>
      </div>

      <p className="attendance-privacy-note">Camera access works on HTTPS or localhost. Captures are sent only after the button is pressed, through the authenticated API, and are not retained by default. Face detection does not prove identity or physical presence; photos and replayed video may spoof an unevaluated system.</p>
    </AppShell>
  );
}
