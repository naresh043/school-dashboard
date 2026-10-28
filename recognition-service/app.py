"""Private recognition adapter. No pretrained model is bundled or enabled."""
import base64
import binascii
import hmac
import io
import os
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
SERVICE_SECRET = os.environ.get("RECOGNITION_SERVICE_SECRET", "")
MAX_IMAGE_BYTES = 2_000_000


@app.exception_handler(RequestValidationError)
async def safe_validation_error(_request, _exception):
    return JSONResponse(status_code=400, content={"detail": "invalid image request"})


class FrameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mimeType: Literal["image/jpeg", "image/png"]
    data: str = Field(min_length=1, max_length=2_800_000)

    @field_validator("data")
    @classmethod
    def validate_image(cls, value: str) -> str:
        try:
            raw = base64.b64decode(value, validate=True)
            if not 1024 <= len(raw) <= MAX_IMAGE_BYTES:
                raise ValueError("frame size outside limits")
            with Image.open(io.BytesIO(raw)) as image:
                if image.format not in ("JPEG", "PNG") or image.width < 160 or image.height < 160 or image.width * image.height > 12_000_000:
                    raise ValueError("unsupported or unsuitable image")
                image.verify()
        except (binascii.Error, UnidentifiedImageError, OSError) as exc:
            raise ValueError("invalid image payload") from exc
        return value


def require_internal_token(authorization: str | None) -> None:
    if len(SERVICE_SECRET) < 32 or not authorization or not hmac.compare_digest(authorization, f"Bearer {SERVICE_SECRET}"):
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/v1/health")
def health(authorization: str | None = Header(default=None)):
    require_internal_token(authorization)
    # This development adapter validates protocol and images only. It cannot identify faces.
    return {"ready": False, "provider": "mock-unavailable", "reason": "licensed_model_not_configured"}


@app.post("/v1/embedding")
def embedding(frame: FrameRequest, authorization: str | None = Header(default=None)):
    require_internal_token(authorization)
    raise HTTPException(status_code=503, detail="licensed recognition model is not configured")
