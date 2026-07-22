"""Hashing primitives.

Two different jobs, two different algorithms — the distinction matters:

* **Passwords** are low-entropy and guessable, so they need a *slow*, salted
  hash. That is bcrypt.
* **API keys and tokens** are high-entropy secrets we generate ourselves. They
  need a *fast*, deterministic hash so a lookup can find the record by its hash
  — bcrypt cannot do that, since every bcrypt hash of the same input differs.
  That is HMAC-SHA256 keyed with the app secret.

Both verifications are constant-time. Never hash an API key with bcrypt, and
never hash a password with SHA-256.
"""

import hashlib
import hmac
import secrets

import bcrypt

from app.core.config import settings

# bcrypt silently truncates past 72 bytes; reject rather than surprise the user.
MAX_PASSWORD_BYTES = 72

API_KEY_PREFIX = "dock_sk"
API_KEY_ENTROPY_BYTES = 32


class PasswordHasher:
    """Slow, salted hashing for user passwords."""

    @staticmethod
    def hash(password: str) -> str:
        encoded = password.encode("utf-8")
        if len(encoded) > MAX_PASSWORD_BYTES:
            raise ValueError(f"Password must be at most {MAX_PASSWORD_BYTES} bytes.")
        return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify(password: str, password_hash: str) -> bool:
        encoded = password.encode("utf-8")
        if len(encoded) > MAX_PASSWORD_BYTES:
            return False
        try:
            return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
        except ValueError:
            # Malformed or truncated hash in the database.
            return False


class TokenHasher:
    """Fast, deterministic, keyed hashing for API keys and opaque tokens.

    Deterministic on purpose: the plaintext key is shown to the user exactly
    once, and every later request is matched by looking up its hash.
    """

    @staticmethod
    def generate() -> str:
        """A new API key. Store only `TokenHasher.hash()` of this value."""
        return f"{API_KEY_PREFIX}_{secrets.token_urlsafe(API_KEY_ENTROPY_BYTES)}"

    @staticmethod
    def hash(token: str) -> str:
        return hmac.new(
            settings.secret_key.encode("utf-8"),
            token.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @classmethod
    def verify(cls, token: str, token_hash: str) -> bool:
        return hmac.compare_digest(cls.hash(token), token_hash)

    @staticmethod
    def fingerprint(token: str) -> str:
        """Last four characters, for showing a key in a list without revealing it."""
        return token[-4:] if len(token) >= 4 else ""


# Module-level shorthands used across the app.
hash_password = PasswordHasher.hash
verify_password = PasswordHasher.verify
hash_token = TokenHasher.hash
verify_token = TokenHasher.verify
generate_api_key = TokenHasher.generate
