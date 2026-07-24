"""App-wide constants that are not environment configuration.

Kept apart from `Settings` because these are product defaults, not things an
operator tunes per deployment.
"""

# Default AI provider for a new user. `model_name` selects the provider family
# (which concrete `AIProvider` to build); `model_version` is the specific model
# string handed to that provider's SDK. Gemini's free tier is the default while
# the feature is being brought up — a user can only override the key for now.
DEFAULT_MODEL_NAME = "gemini"
DEFAULT_MODEL_VERSION = "gemini-3.6-flash"
