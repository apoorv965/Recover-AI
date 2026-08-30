"""
Auth API
========

POST /auth/google   -> exchange a Google ID token for our own session JWT
                        (creates the User row on first sign-in)
GET  /auth/me        -> return the currently authenticated user
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import GoogleTokenError, create_session_token, get_current_user, verify_google_id_token
from app.database import get_db
from app.models import User
from app.schemas import GoogleLoginIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenOut)
def google_login(payload: GoogleLoginIn, db: Session = Depends(get_db)):
    try:
        claims = verify_google_id_token(payload.credential)
    except GoogleTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    google_sub = claims["sub"]
    email = claims.get("email")
    name = claims.get("name")
    picture = claims.get("picture")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if not user:
        # Also guard against a pre-existing row with the same email (shouldn't
        # normally happen since email is unique per verified Google account).
        user = db.query(User).filter(User.email == email).first()

    if user:
        user.email = email
        user.name = name
        user.picture = picture
        user.google_sub = google_sub
        user.last_login_at = datetime.utcnow()
    else:
        user = User(google_sub=google_sub, email=email, name=name, picture=picture)
        db.add(user)

    db.commit()
    db.refresh(user)

    token = create_session_token(user)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
