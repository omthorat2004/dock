"""AES-256-GCM encryption of the stored provider key."""

import base64

from app.core.crypto import SCHEME, decrypt_secret, encrypt_secret, is_encrypted

KEY = "AIzaSyExampleProviderKey"
OWNER = "user-1"


def test_a_key_survives_a_round_trip():
    sealed = encrypt_secret(KEY, context=OWNER)
    assert decrypt_secret(sealed, context=OWNER) == KEY


def test_the_stored_value_does_not_contain_the_key():
    sealed = encrypt_secret(KEY, context=OWNER)
    assert KEY not in sealed
    assert sealed.startswith(f"{SCHEME}:")
    assert is_encrypted(sealed)


def test_encrypting_twice_gives_different_ciphertext():
    """A fresh nonce each time, so equal keys are not equal on disk."""
    first = encrypt_secret(KEY, context=OWNER)
    second = encrypt_secret(KEY, context=OWNER)
    assert first != second
    assert decrypt_secret(first, context=OWNER) == decrypt_secret(second, context=OWNER)


def test_another_users_ciphertext_does_not_decrypt():
    """The point of binding to the owner: a copied row is worthless."""
    sealed = encrypt_secret(KEY, context=OWNER)
    assert decrypt_secret(sealed, context="user-2") is None


def test_a_tampered_value_does_not_decrypt():
    sealed = encrypt_secret(KEY, context=OWNER)
    raw = bytearray(base64.urlsafe_b64decode(sealed[len(SCHEME) + 1 :]))
    raw[-1] ^= 0x01  # flip a bit in the tag
    tampered = f"{SCHEME}:{base64.urlsafe_b64encode(bytes(raw)).decode()}"
    assert decrypt_secret(tampered, context=OWNER) is None


def test_a_legacy_plaintext_value_is_not_readable():
    """Un-migrated plaintext reads as "no key", not as a usable key."""
    assert decrypt_secret("sk-plaintext-123", context=OWNER) is None
    assert is_encrypted("sk-plaintext-123") is False


def test_nothing_stored_reads_as_nothing():
    assert decrypt_secret(None, context=OWNER) is None
    assert decrypt_secret("", context=OWNER) is None
    assert is_encrypted(None) is False


def test_a_malformed_value_does_not_raise():
    assert decrypt_secret(f"{SCHEME}:not-base64!!", context=OWNER) is None
    assert decrypt_secret(f"{SCHEME}:c2hvcnQ=", context=OWNER) is None
