# Face detection model

`blaze_face_short_range.tflite` is the MediaPipe BlazeFace short-range model, served locally from this directory so the application does not fetch model weights from a remote host at runtime.

- Upstream model: [MediaPipe Face Detector, short-range float16 model](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)
- Model card: [MediaPipe BlazeFace Model Card (Short Range)](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf)
- License: Apache License 2.0, as stated by the model card.
- Detection range: designed for faces within about 2 meters of the camera.
- Detection confidence threshold: 0.5.

The face detector locates faces; it does not identify people. The model is loaded from `/models/blaze_face_short_range.tflite` by the attendance camera hook.
