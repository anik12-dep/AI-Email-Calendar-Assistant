
import os
from pathlib import Path

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

load_dotenv()

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE = BASE_DIR / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
]

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

# Store the original OAuth Flow, including its PKCE verifier
oauth_flows = {}


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

    # Save the same Flow object for the callback
    oauth_flows[state] = flow

    return {
        "authorization_url": authorization_url,
        "message": "Open authorization_url in your browser to connect Google Calendar."
    }


@router.get("/auth/google/callback")
def google_callback(request: Request, state: str):

    if state not in oauth_flows:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state. Please login again."
        )

    # Retrieve the original Flow with its code_verifier
    flow = oauth_flows.pop(state)

    try:
        flow.fetch_token(
            authorization_response=str(request.url)
        )

        credentials = flow.credentials

        with open(TOKEN_FILE, "w") as token:
            token.write(credentials.to_json())

        return RedirectResponse(
            url="http://localhost:5173/calendar?google_connected=true"
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Google authentication failed: {str(error)}"
        )


def get_google_credentials():

    if not TOKEN_FILE.exists():
        raise HTTPException(
            status_code=401,
            detail="Google Calendar is not connected. Please connect first."
        )

    try:
        credentials = Credentials.from_authorized_user_file(
            str(TOKEN_FILE),
            SCOPES
        )

        if not credentials.valid:

            if credentials.expired and credentials.refresh_token:

                from google.auth.transport.requests import Request as GoogleRequest

                credentials.refresh(GoogleRequest())

                with open(TOKEN_FILE, "w") as token:
                    token.write(credentials.to_json())

            else:
                raise HTTPException(
                    status_code=401,
                    detail="Google credentials expired. Please connect again."
                )

        return credentials

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail=f"Could not load Google credentials: {str(error)}"
        )


@router.get("/auth/google/status")
def google_status():

    return {
        "connected": TOKEN_FILE.exists()
    }
