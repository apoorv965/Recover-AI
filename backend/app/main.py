"""
RecoverAI — Autonomous Revenue Recovery Agent
===============================================

FastAPI application entrypoint.

Architecture: AI recommends -> Policy Engine validates -> Action Engine
executes -> Audit System records. See app/services/ for each component.
"""
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if present, before anything reads os.environ

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import Base, engine, SessionLocal, get_db
from app.routers import auth as auth_router
from app.routers import events, cases, analytics, audit
from app import simulation
from app.models import RecoveryCase

app = FastAPI(
    title="RecoverAI API",
    description="Autonomous Revenue Recovery Agent — detects and recovers revenue at risk "
                "from failed payments and abandoned checkouts.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP: open CORS. Restrict to known origins in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)

# Everything below requires a valid Google-authenticated session (Authorization:
# Bearer <token> issued by POST /auth/google). Signing in is the only way in —
# there's no anonymous access to case data, analytics, or the audit trail.
_protected = [Depends(get_current_user)]
app.include_router(events.router, dependencies=_protected)
app.include_router(cases.router, dependencies=_protected)
app.include_router(analytics.router, dependencies=_protected)
app.include_router(audit.router, dependencies=_protected)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Auto-seed the database with demo data on first run so the app is
    # immediately demonstrable.
    db = SessionLocal()
    try:
        existing = db.query(RecoveryCase).count()
        if existing == 0:
            simulation.generate_batch(db, count=120)
    finally:
        db.close()


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "RecoverAI API"}


@app.post("/simulation/generate", tags=["simulation"])
def run_simulation(count: int = 120, db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """Manually (re)generate a batch of synthetic transactions. Adds to existing data."""
    import random as _random
    result = simulation.generate_batch(db, count=count, seed=_random.randint(1, 999999))
    return result
