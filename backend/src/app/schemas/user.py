from pydantic import BaseModel, Field


class ApiKeyRequest(BaseModel):
    #: The provider API key to store.
    api_key: str = Field(min_length=1, max_length=512)
    #: The model to run, e.g. "gemini-3.6-flash". The SDK needs it on every
    #: call, so the user chooses it here. The provider family is still derived
    #: server-side (Gemini) for now, so only the model version is sent.
    model_version: str = Field(min_length=1, max_length=100)
