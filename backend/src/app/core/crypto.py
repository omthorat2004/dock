"""AES-256-GCM for the one secret Dock has to hand back out again.

`core.hashing` covers everything the app only ever *verifies*. A user's AI
provider key is the exception: it has to be replayed to the vendor on every
model call, so it cannot be hashed. It is encrypted instead, and a database
dump on its own no longer contains anybody's key.

AES-256-GCM is authenticated encryption: tampering with a stored value makes it
fail to decrypt rather than decrypt to something else. Each encryption draws a
fresh 96-bit nonce, so storing the same key twice produces different ciphertext.

Every value is bound to the user it belongs to through GCM's associated data.
Copying one row's ciphertext into another user's document therefore yields a
value that will not decrypt, instead of quietly handing that user someone
else's provider quota.

The 256-bit key is derived from `settings.secret_key` with HKDF under its own
info label, so it is not the same bytes that sign tokens even though both come
from one configured secret. Nothing extra has to be deployed, and rotating
`SECRET_KEY` invalidates exactly one thing: stored provider keys, which their
owners can paste in again.
"""

import base64
import binascii
import os
from functools import lru_cache

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import settings

#: Marks a stored value as "encrypted by this scheme". A value without it is
#: not decryptable here: either a legacy plaintext key from before encryption,
#: or something no version of this code wrote.
SCHEME = "v1"

#: Domain separation for the derived key. Changing this string orphans every
#: stored ciphertext, so it is a constant rather than a setting.
_KEY_INFO = b"dock.provider-api-key.v1"

KEY_BYTES = 32  # AES-256.
NONCE_BYTES = 12  # 96 bits, the size GCM is specified for.


@lru_cache
def _aead() -> AESGCM:
    """The cipher for this process, keyed off the app secret."""
    key = HKDF(
        algorithm=hashes.SHA256(),
        length=KEY_BYTES,
        salt=None,
        info=_KEY_INFO,
    ).derive(settings.secret_key.encode("utf-8"))
    return AESGCM(key)


def encrypt_secret(plaintext: str, *, context: str) -> str:
    """Encrypt a secret for storage, bound to `context` (the owner's id).

    Returns `v1:<base64url(nonce + ciphertext + tag)>`, which is safe to keep
    in Mongo and safe to log.
    """
    nonce = os.urandom(NONCE_BYTES)
    sealed = _aead().encrypt(nonce, plaintext.encode("utf-8"), context.encode("utf-8"))
    return f"{SCHEME}:{base64.urlsafe_b64encode(nonce + sealed).decode('utf-8')}"


def decrypt_secret(stored: str | None, *, context: str) -> str | None:
    """The plaintext back, or None if there is nothing this app can read.

    None is one answer to several situations, deliberately: an empty field, a
    legacy plaintext value, ciphertext written under a different `SECRET_KEY`,
    and ciphertext that belongs to another user all mean the same thing to
    every caller, which is that the user has to supply their key again.
    """
    if not stored or not stored.startswith(f"{SCHEME}:"):
        return None

    try:
        raw = base64.urlsafe_b64decode(stored[len(SCHEME) + 1 :])
    except (binascii.Error, ValueError):
        return None
    if len(raw) <= NONCE_BYTES:
        return None

    try:
        plaintext = _aead().decrypt(
            raw[:NONCE_BYTES], raw[NONCE_BYTES:], context.encode("utf-8")
        )
    except InvalidTag:
        return None
    return plaintext.decode("utf-8")


def is_encrypted(stored: str | None) -> bool:
    """Whether a stored value was written by this scheme, without decrypting it.

    For the migration, which has to tell an already-encrypted key apart from a
    plaintext one it still has to convert.
    """
    return bool(stored) and stored.startswith(f"{SCHEME}:")
