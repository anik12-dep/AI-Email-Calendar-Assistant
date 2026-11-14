
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from google_auth import get_google_credentials, require_authenticated_session

router = APIRouter()


def get_calendar_service(user_id: str):
    credentials = get_google_credentials(user_id)

    return build(
        "calendar",
        "v3",
        credentials=credentials,
        cache_discovery=False
    )


class CreateEventRequest(BaseModel):
    summary: str = Field(min_length=1, max_length=200)
    description: str = ""
    start_datetime: datetime
    end_datetime: datetime
    timezone: str = "Asia/Dhaka"

class UpdateEventRequest(BaseModel):
    summary: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    timezone: str | None = "Asia/Dhaka"

@router.get("/google-calendar/events")
def get_calendar_events(
    user_id: str = Depends(require_authenticated_session),
    max_results: int = Query(default=10, ge=1, le=100)
):
    try:
        service = get_calendar_service(user_id)

        now = datetime.now(timezone.utc).isoformat()

        events_result = service.events().list(
            calendarId="primary",
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime"
        ).execute()

        events = events_result.get("items", [])

        return {
            "total_events": len(events),
            "events": events
        }

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Google Calendar API error: {error}"
        )


@router.post("/google-calendar/create-event")
def create_calendar_event(
    event: CreateEventRequest,
    user_id: str = Depends(require_authenticated_session)
):
    try:
        if event.end_datetime <= event.start_datetime:
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time."
            )

        service = get_calendar_service(user_id)

        event_body = {
            "summary": event.summary,
            "description": event.description,
            "start": {
                "dateTime": event.start_datetime.isoformat(),
                "timeZone": event.timezone
            },
            "end": {
                "dateTime": event.end_datetime.isoformat(),
                "timeZone": event.timezone
            }
        }

        created_event = service.events().insert(
            calendarId="primary",
            body=event_body
        ).execute()

        return {
            "message": "Google Calendar event created successfully!",
            "event_id": created_event.get("id"),
            "event_link": created_event.get("htmlLink"),
            "summary": created_event.get("summary")
        }

    except HTTPException:
        raise

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Google Calendar API error: {error}"
        )


@router.put("/google-calendar/events/{event_id}")
def update_calendar_event(
    event_id: str,
    event: UpdateEventRequest,
    user_id: str = Depends(require_authenticated_session)
):
    try:
        service = get_calendar_service(user_id)

        # Check whether event exists
        existing_event = service.events().get(
            calendarId="primary",
            eventId=event_id
        ).execute()

        # Validate date and time
        if (event.start_datetime is None) != (event.end_datetime is None):
            raise HTTPException(
                status_code=400,
                detail="Provide both start_datetime and end_datetime."
            )

        if (
            event.start_datetime is not None
            and event.end_datetime <= event.start_datetime
        ):
            raise HTTPException(
                status_code=400,
                detail="End time must be after start time."
            )

        # Prepare updated fields
        event_body = {}

        if event.summary is not None:
            event_body["summary"] = event.summary

        if event.description is not None:
            event_body["description"] = event.description

        if event.start_datetime is not None:
            event_body["start"] = {
                "dateTime": event.start_datetime.isoformat(),
                "timeZone": event.timezone or "Asia/Dhaka"
            }

            event_body["end"] = {
                "dateTime": event.end_datetime.isoformat(),
                "timeZone": event.timezone or "Asia/Dhaka"
            }

        if not event_body:
            raise HTTPException(
                status_code=400,
                detail="Provide at least one field to update."
            )

        updated_event = service.events().patch(
            calendarId="primary",
            eventId=event_id,
            body=event_body
        ).execute()

        return {
            "message": "Google Calendar event updated successfully!",
            "event_id": updated_event.get("id"),
            "event_link": updated_event.get("htmlLink"),
            "summary": updated_event.get("summary")
        }

    except HTTPException:
        raise

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Google Calendar API error: {error}"
        )


@router.delete("/google-calendar/events/{event_id}")
def delete_calendar_event(
    event_id: str,
    user_id: str = Depends(require_authenticated_session)
):
    try:
        service = get_calendar_service(user_id)

        # Check whether event exists
        service.events().get(
            calendarId="primary",
            eventId=event_id
        ).execute()

        # Delete event
        service.events().delete(
            calendarId="primary",
            eventId=event_id
        ).execute()

        return {
            "message": "Google Calendar event deleted successfully!",
            "event_id": event_id
        }

    except HttpError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Google Calendar API error: {error}"
        )
