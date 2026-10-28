import base64
import io
import unittest
from fastapi.testclient import TestClient
from PIL import Image
import app as service

TEST_SECRET = "test-only-internal-service-secret"
service.SERVICE_SECRET = TEST_SECRET


def sample_png():
    stream = io.BytesIO()
    image = Image.new("RGB", (256, 256))
    for y in range(256):
        for x in range(256):
            image.putpixel((x, y), ((x * 31 + y * 17) % 256, (x * 13 + y * 29) % 256, (x * 7 + y * 23) % 256))
    image.save(stream, format="PNG")
    return base64.b64encode(stream.getvalue()).decode("ascii")


class RecognitionHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_context = TestClient(service.app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)

    def request(self, path, method="GET", token=None, body=None):
        headers = {}
        if token is not None:
            headers["Authorization"] = f"Bearer {token}"
        response = self.client.request(method, path, headers=headers, json=body)
        return response.status_code, response.json()

    def test_health_endpoint_requires_token_and_reports_model_not_ready(self):
        self.assertEqual(self.request("/v1/health")[0], 401)
        self.assertEqual(self.request("/v1/health", token="wrong-token")[0], 401)
        status, payload = self.request("/v1/health", token=TEST_SECRET)
        self.assertEqual(status, 200)
        self.assertFalse(payload["ready"])
        self.assertEqual(payload["provider"], "mock-unavailable")
        self.assertEqual(payload["reason"], "licensed_model_not_configured")

    def test_embedding_requires_token_even_for_a_valid_synthetic_image(self):
        body = {"mimeType": "image/png", "data": sample_png()}
        self.assertEqual(self.request("/v1/embedding", method="POST", body=body)[0], 401)
        self.assertEqual(self.request("/v1/embedding", method="POST", token="wrong-token", body=body)[0], 401)

    def test_embedding_returns_unavailable_after_validating_synthetic_image(self):
        body = {"mimeType": "image/png", "data": sample_png()}
        status, payload = self.request("/v1/embedding", method="POST", token=TEST_SECRET, body=body)
        self.assertEqual(status, 503)
        self.assertEqual(payload["detail"], "licensed recognition model is not configured")

    def test_embedding_rejects_invalid_image_as_client_error(self):
        body = {"mimeType": "image/png", "data": "YQ=="}
        status, payload = self.request("/v1/embedding", method="POST", token=TEST_SECRET, body=body)
        self.assertEqual(status, 400)
        self.assertEqual(payload, {"detail": "invalid image request"})


if __name__ == "__main__":
    unittest.main()
