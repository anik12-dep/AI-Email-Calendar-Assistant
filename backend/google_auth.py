import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.oauth2 import id_token
from google.auth.transport.requests import Request as GoogleRequest

from user_store import (
    save_oauth_state,
    consume_oauth_state,
    save_user_credentials,
    load_user_credentials,
    get_user_email,
    get_user_sub_by_email,
)

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

OWNER_EMAIL = "anikmoy333@gmail.com"

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
).rstrip("/")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Allow Google to return previously granted additional scopes.
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

if GOOGLE_REDIRECT_URI and GOOGLE_REDIRECT_URI.startswith(
    ("http://localhost", "http://127.0.0.1")
):
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
else:
    os.environ.pop("OAUTHLIB_INSECURE_TRANSPORT", None)

router = APIRouter()

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send",
]


def get_google_flow(state=None):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials are missing from .env"
        )

    if not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_REDIRECT_URI is missing from .env"
        )

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI]
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state,
        autogenerate_code_verifier=True
    )

    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow


@router.get("/auth/google/login")
def google_login():
    flow = get_google_flow()

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    if not flow.code_verifier:
        raise HTTPException(
            status_code=500,
            detail="Could not generate OAuth PKCE verifier."
        )

    save_oauth_state(state, flow.code_verifier)

    return {
        "authorization_url": authorization_url,
        "message": "Authorize the shared Google account."
    }


@router.get("/auth/google/callback")
def google_callback(request: Request, state: str):
    code_verifier = consume_oauth_state(state)

    if not code_verifier:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state. Please try again."
        )

    try:
        flow = get_google_flow(state=state)
        flow.code_verifier = code_verifier

        flow.fetch_token(
            authorization_response=str(request.url)
        )

        credentials = flow.credentials

        if not credentials.id_token:
            raise ValueError("Google did not return an identity token.")

        identity = id_token.verify_oauth2_token(
            credentials.id_token,
            GoogleRequest(),
            GOOGLE_CLIENT_ID
        )

        google_sub = identity.get("sub")
        email = identity.get("email")

        if (
            not google_sub
            or not email
            or not identity.get("email_verified")
        ):
            raise ValueError("Google account identity could not be verified.")

        if email.lower() != OWNER_EMAIL.lower():
            raise HTTPException(
                status_code=403,
                detail="Only the configured shared Google account can authorize this application."
            )

        save_user_credentials(
            google_sub=google_sub,
            email=email,
            credentials=credentials
        )

        request.session.clear()
        request.session["user_id"] = google_sub
        request.session["user_email"] = email

        return RedirectResponse(
            url=f"{FRONTEND_URL}/calendar?google_connected=true"
        )

    except HTTPException:
        raise
    except Exception as exc:
        print(
            f"[GOOGLE AUTH ERROR] "
            f"type={type(exc).__name__} detail={str(exc)[:300]}"
        )
        raise HTTPException(
            status_code=400,
            detail="Google authentication failed. Please try connecting again."
        )


def get_google_credentials(user_id: str):
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Google account is not connected."
        )

    try:
        credential_data = load_user_credentials(user_id)

        if not credential_data:
            raise HTTPException(
                status_code=401,
                detail="Google account is not connected. Please authorize it."
            )

        credentials = Credentials.from_authorized_user_info(
            credential_data,
            SCOPES
        )

        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(GoogleRequest())

                email = get_user_email(user_id)

                if not email:
                    raise HTTPException(
                        status_code=401,
                        detail="Google account not found."
                    )

                save_user_credentials(
                    google_sub=user_id,
                    email=email,
                    credentials=credentials
                )
            else:
                raise HTTPException(
                    status_code=401,
                    detail="Google credentials expired. Please authorize again."
                )

        return credentials

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Could not load Google credentials."
        )


def get_shared_google_credentials():
    google_sub = get_user_sub_by_email(OWNER_EMAIL)

    if not google_sub:
        raise HTTPException(
            status_code=401,
            detail="Shared Google account has not been authorized yet."
        )

    return get_google_credentials(google_sub)


@router.get("/auth/google/status")
def google_status():
    google_sub = get_user_sub_by_email(OWNER_EMAIL)

    return {
        "connected": bool(google_sub),
        "email": OWNER_EMAIL if google_sub else None
    }


def require_authenticated_session(request: Request):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    return user_id
