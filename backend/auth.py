"""authentication helpers for password hashing and jwt based login."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# secret used to sign jwt tokens, should be changed in production
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")

# algorithm used for signing and verifying jwt tokens
JWT_ALGO = "HS256"

# token validity period in days
JWT_EXPIRE_DAYS = 7

# this reads the authorization header, but does not auto-throw if missing
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """hash a plain password before storing it in the database."""

    # bcrypt adds a salt internally, so the same password will not always produce the same hash
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """check whether a plain password matches a stored bcrypt hash."""

    try:
        # bcrypt compares the entered password with the stored hash safely
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        # return false if the stored hash is invalid or comparison fails
        return False


def create_token(user_id: str, email: str) -> str:
    """create a signed jwt token for a logged-in user."""

    # payload stores the user identity and token timing information
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }

    # encode signs the payload so it cannot be changed without the secret
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    """decode and validate a jwt token."""

    try:
        # this checks token signature and expiry automatically
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        # token was valid earlier but has now expired
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        # token is missing, changed, signed with another secret, or malformed
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """fastapi dependency that returns the logged-in user's id."""

    # protected routes call this automatically through depends
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # decode the bearer token received from the authorization header
    payload = decode_token(creds.credentials)
    user_id = payload.get("sub")

    # every valid token must contain a subject user id
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return user_id
