import pytest

from app.core.hashing import (
    API_KEY_PREFIX,
    MAX_PASSWORD_BYTES,
    PasswordHasher,
    TokenHasher,
)


def test_password_hash_is_salted():
    first = PasswordHasher.hash("passw0rd1")
    second = PasswordHasher.hash("passw0rd1")
    assert first != second
    assert PasswordHasher.verify("passw0rd1", first)
    assert PasswordHasher.verify("passw0rd1", second)


def test_password_verify_rejects_the_wrong_password():
    assert not PasswordHasher.verify("nope", PasswordHasher.hash("passw0rd1"))


def test_password_verify_survives_a_malformed_hash():
    assert not PasswordHasher.verify("passw0rd1", "not-a-bcrypt-hash")


def test_password_longer_than_the_bcrypt_limit_is_rejected():
    with pytest.raises(ValueError):
        PasswordHasher.hash("a" * (MAX_PASSWORD_BYTES + 1))


def test_generated_api_keys_are_unique_and_prefixed():
    first = TokenHasher.generate()
    second = TokenHasher.generate()
    assert first != second
    assert first.startswith(f"{API_KEY_PREFIX}_")


def test_token_hash_is_deterministic_so_it_can_be_looked_up():
    key = TokenHasher.generate()
    assert TokenHasher.hash(key) == TokenHasher.hash(key)
    assert TokenHasher.verify(key, TokenHasher.hash(key))


def test_token_verify_rejects_a_different_key():
    assert not TokenHasher.verify(
        TokenHasher.generate(), TokenHasher.hash(TokenHasher.generate())
    )


def test_fingerprint_reveals_only_the_last_four_characters():
    key = TokenHasher.generate()
    assert TokenHasher.fingerprint(key) == key[-4:]
    assert len(TokenHasher.fingerprint(key)) == 4
