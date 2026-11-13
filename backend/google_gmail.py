
import base64

from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException, Query
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from pydantic import BaseModel

from google_auth import get_google_credentials

router = APIRouter()


def get_gmail_service():
    credentials = get_google_credentials()

    return build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False
    )


def decode_email_body(payload):
    """Extract the plain-text body from a Gmail message."""

    body_data = None

    if payload.get("mimeType") == "text/plain":
        body_data = payload.get("body", {}).get("data")

    if body_data:
        decoded = base64.urlsafe_b64decode(body_data)
        return decoded.decode("utf-8", errors="replace")

    for part in payload.get("parts", []):
        result = decode_email_body(part)
        if result:
            return result

    return ""


@router.get("/gmail/messages")
def get_gmail_messages(
    max_results: int = Query(default=10, ge=1, le=50),
    category: str = Query(default="inbox")
):
    try:
        service = get_gmail_service()

        category = category.lower()

        label_map = {
            "inbox": "INBOX",
            "sent": "SENT",
            "starred": "STARRED",
            "trash": "TRASH"
        }

        if category in label_map:
            messages_result = service.users().messages().list(
                userId="me",
                labelIds=[label_map[category]],
                maxResults=max_results
            ).execute()

        elif category == "archived":
            messages_result = service.users().messages().list(
                userId="me",
                q="-in:inbox -in:trash -in:spam",
                maxResults=max_results
            ).execute()

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid category."
            )

        message_ids = messages_result.get("messages", [])
        emails = []

        for message in message_ids:
            email_data = service.users().messages().get(
                userId="me",
                id=message["id"],
                format="full"
            ).execute()

            payload = email_data.get("payload", {})
            headers = payload.get("headers", [])

            header_map = {
                header["name"].lower(): header["value"]
                for header in headers
            }

            emails.append({
                "id": email_data.get("id"),
                "thread_id": email_data.get("threadId"),
                "sender": header_map.get("from", ""),
                "to": header_map.get("to", ""),
                "subject": header_map.get("subject", "(No Subject)"),
                "date": header_map.get("date", ""),
                "snippet": email_data.get("snippet", ""),
                "body": decode_email_body(payload),
                "unread": "UNREAD" in email_data.get("labelIds", []),
                "labels": email_data.get("labelIds", [])
            })

        return {
            "total_emails": len(emails),
            "category": category,
            "emails": emails
        }

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Gmail API error: {error}"
        )


class GmailReplyRequest(BaseModel):
    message_id: str
    reply_body: str


@router.post("/gmail/reply")
def send_gmail_reply(request: GmailReplyRequest):
    try:
        if not request.reply_body.strip():
            raise HTTPException(
                status_code=400,
                detail="Reply message cannot be empty."
            )

        service = get_gmail_service()

        original_email = service.users().messages().get(
            userId="me",
            id=request.message_id,
            format="full"
        ).execute()

        payload = original_email.get("payload", {})
        headers = payload.get("headers", [])

        header_map = {
            header["name"].lower(): header["value"]
            for header in headers
        }

        recipient = (
            header_map.get("reply-to")
            or header_map.get("from")
        )

        if not recipient:
            raise HTTPException(
                status_code=400,
                detail="Original email sender not found."
            )

        original_subject = header_map.get("subject", "")

        if not original_subject.lower().startswith("re:"):
            original_subject = f"Re: {original_subject}"

        message = MIMEText(request.reply_body, "plain", "utf-8")
        message["to"] = recipient
        message["subject"] = original_subject

        message_id_header = header_map.get("message-id")
        references = header_map.get("references", "")

        if message_id_header:
            message["In-Reply-To"] = message_id_header
            message["References"] = (
                f"{references} {message_id_header}".strip()
            )

        raw_message = base64.urlsafe_b64encode(
            message.as_bytes()
        ).decode("utf-8")

        sent_message = service.users().messages().send(
            userId="me",
            body={
                "raw": raw_message,
                "threadId": original_email.get("threadId")
            }
        ).execute()

        return {
            "success": True,
            "message": "Reply sent successfully!",
            "message_id": sent_message.get("id")
        }

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Gmail reply error: {error}"
        )
