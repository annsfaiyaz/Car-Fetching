"""Encrypt API keys at rest using Fernet (master key from APP_SECRET_KEY)."""

from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken


def _fernet_from_master() -> Fernet | None:
    raw = (os.environ.get("APP_SECRET_KEY") or "").strip()
    if not raw:
        return None
    # Derive a Fernet-compatible key from arbitrary string
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(plain: str) -> str:
    f = _fernet_from_master()
    if f is None:
        raise ValueError("APP_SECRET_KEY is not set — cannot encrypt credentials.")
    return f.encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    f = _fernet_from_master()
    if f is None:
        raise ValueError("APP_SECRET_KEY is not set — cannot decrypt credentials.")
    try:
        return f.decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as e:
        raise ValueError("Invalid encrypted blob or wrong APP_SECRET_KEY") from e


def mask_key(k: str | None) -> str:
    if not k:
        return ""
    if len(k) <= 8:
        return "••••••••"
    return k[:4] + "…" + k[-4:]
