from pydantic import BaseModel, Field


class ApiKeyRequest(BaseModel):
    #: The provider API key to store. The model and version are defaulted server
    #: side for now, so the body carries only this.
    api_key: str = Field(min_length=1, max_length=512)
