"""Fernet-based encryption utilities.

This module provides helpers to generate a key and encrypt/decrypt tokens.
It uses ENCRYPTION_KEY from settings when available.
"""
from __future__ import annotations

import base64
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def generate_key() -> str:
    """Generate a new Fernet key as a URL-safe base64-encoded string.

    Returns:
        str: The generated key.
    """
    return Fernet.generate_key().decode("utf-8")


def _get_fernet(custom_key: Optional[str] = None) -> Fernet:
    """Create a Fernet instance from the provided key or settings.ENCRYPTION_KEY.

    Args:
        custom_key: Optional override key to use.

    Raises:
        ValueError: If no key is available or the key is not valid base64.

    Returns:
        Fernet: A Fernet instance ready to encrypt/decrypt.
    """
    key = (custom_key or settings.ENCRYPTION_KEY or "").strip()
    if not key:
        raise ValueError("ENCRYPTION_KEY is not set. Set it in your environment.")

    # Validate key format (must be URL-safe base64-encoded 32-byte key)
    try:
        # If provided as bytes-like string without proper padding, this will error
        base64.urlsafe_b64decode(key + "==")
    except Exception as ex:
        raise ValueError("ENCRYPTION_KEY is not a valid Fernet key") from ex

    return Fernet(key.encode("utf-8"))


def encrypt_token(plaintext: str, *, key: Optional[str] = None) -> str:
    """Encrypt a plaintext string using Fernet.

    Args:
        plaintext: The string to encrypt.
        key: Optional Fernet key to override settings.ENCRYPTION_KEY.

    Returns:
        str: URL-safe base64 ciphertext.
    """
    f = _get_fernet(key)
    token = f.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_token(ciphertext: str, *, key: Optional[str] = None) -> str:
    """Decrypt a Fernet-encrypted string.

    Args:
        ciphertext: The encrypted token string.
        key: Optional Fernet key to override settings.ENCRYPTION_KEY.

    Raises:
        InvalidToken: If the token cannot be decrypted with the key.

    Returns:
        str: The decrypted plaintext string.
    """
    f = _get_fernet(key)
    try:
        plaintext = f.decrypt(ciphertext.encode("utf-8"))
        return plaintext.decode("utf-8")
    except InvalidToken:
        # Re-raise to allow callers to handle
        raise
