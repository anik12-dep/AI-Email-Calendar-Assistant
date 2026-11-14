import os
import ssl
import smtplib
import uuid

from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr
from zoneinfo import ZoneInfo

from icalendar import Calendar, Event, vCalAddress, vText


def create_ics_file(
    title: str,
    description: str,
    start_time: datetime,
    end_time: datetime,
    location: str,
    recipient_email: str,
    organizer_email: str = "",
) -> bytes:

    dhaka_timezone = ZoneInfo("Asia/Dhaka")

    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=dhaka_timezone)

    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=dhaka_timezone)

    calendar = Calendar()
    calendar.add("prodid", "-//AI Email Calendar Assistant//EN")
    calendar.add("version", "2.0")
    calendar.add("method", "REQUEST")

    event = Event()
    event.add("uid", f"{uuid.uuid4()}@ai-email-calendar-assistant")
    event.add("dtstamp", datetime.now(timezone.utc))
    event.add("summary", vText(title))
    event.add("description", vText(description))
    event.add("dtstart", start_time)
    event.add("dtend", end_time)
    event.add("organizer", vCalAddress(
        f"mailto:{organizer_email or os.getenv('SMTP_FROM_EMAIL', os.getenv('SMTP_USERNAME', ''))}"
    ))
    event.add("attendee", vCalAddress(f"mailto:{recipient_email}"))

    if location:
        event.add("location", vText(location))

    event.add("status", "CONFIRMED")
    event.add("sequence", 0)

    calendar.add_component(event)

    return calendar.to_ical()


def send_invitation_email(
    recipient_email: str,
    title: str,
    ics_content: bytes,
) -> None:

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
    sender_name = os.getenv("SMTP_FROM_NAME", "AI Calendar Assistant")

    required = {
        "SMTP_HOST": smtp_host,
        "SMTP_USERNAME": smtp_username,
        "SMTP_PASSWORD": smtp_password,
        "SMTP_FROM_EMAIL": sender_email,
    }

    missing = [key for key, value in required.items() if not value]

    if missing:
        raise RuntimeError(
            "Missing SMTP configuration: " + ", ".join(missing)
        )

    message = EmailMessage()
    message["Subject"] = f"Calendar Invitation: {title}"
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient_email
    message["Content-Class"] = "urn:content-classes:calendarmessage"

    message.set_content(
        f"Hello,\\n\\n"
        f"You have received a calendar invitation for: {title}\\n\\n"
        f"Your calendar invitation is included in this email. "
        f"You can also download the attached meeting_invitation.ics file.\\n\\n"
        f"Regards,\\n{sender_name}"
    )

    message.add_alternative(
        ics_content.decode("utf-8"),
        subtype="calendar",
        params={"method": "REQUEST", "charset": "UTF-8"},
    )

    message.get_payload()[-1].add_header("Content-Disposition", "inline")

    message.add_attachment(
        ics_content,
        maintype="text",
        subtype="calendar",
        filename="meeting_invitation.ics",
        params={"method": "REQUEST", "charset": "UTF-8"},
    )

    if smtp_port == 465:
        with smtplib.SMTP_SSL(
            smtp_host,
            smtp_port,
            context=ssl.create_default_context(),
            timeout=20,
        ) as server:
            server.login(smtp_username, smtp_password)
            server.send_message(message)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
