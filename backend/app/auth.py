"""
Authentication
==============

Google Sign-In is the only login method. Flow:

1. Frontend uses Google Identity Services to get a signed Google ID token
   for the signed-in user (this never touches our backend).
2. Frontend POSTs that ID token to POST /auth/google.
3. Backend verifies the token's signature/audience/expiry directly with
   Google's public keys (via google-auth), upserts a local User row keyed
   on the token's stable `sub` claim, and issues our OWN short-lived
   session JWT (HS256, signed with JWT_SECRET) for the frontend to send
   back as `Authorization: Bearer <token>` on every subsequent API call.

We never trust a client-supplied "who am I" claim for anything other than
the initial Google token exchange — every protected route re-verifies our
own JWT on every request via `get_current_user`.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

_google_request = google_requests.Request()
_bearer_scheme = HTTPBearer(auto_error=False)


class GoogleTokenError(ValueError):
    pass


def verify_google_id_token(credential: str) -> dict:
    """Verify a Google ID token (the `credential` from Google Identity Services).

    Returns the decoded claims (sub, email, name, picture, ...) on success.
    Raises GoogleTokenError if the token is invalid, expired, or issued for
    a different Google OAuth client.
    """
    if not GOOGLE_CLIENT_ID:
        raise GoogleTokenError(
            "Server is missing GOOGLE_CLIENT_ID. Set it in the backend environment "
            "to the same OAuth 2.0 Client ID configured in the Google Cloud Console."
        )
    try:
        claims = google_id_token.verify_oauth2_token(
            credential, _google_request, GOOGLE_CLIENT_ID
        )
    except Exception as exc:  # invalid signature, expired, wrong audience, malformed, ...
        raise GoogleTokenError(f"Invalid Google ID token: {exc}") from exc

    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleTokenError("Invalid token issuer.")
    if not claims.get("email_verified", False):
        raise GoogleTokenError("Google account email is not verified.")
    return claims


def create_session_token(user: User) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": user.id,
        "email": user.email,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: require a valid session JWT, return the User row."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Sign in with Google first.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_session_token(credentials.credentials)
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists.")
    return user
