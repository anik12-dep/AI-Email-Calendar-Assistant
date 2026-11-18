import os
import ssl
import smtplib

from email.message import EmailMessage
from email.utils import formataddr


def send_regular_email(
    recipient_email: str,
    subject: str,
    body: str,
    ics_content: bytes | None = None,
) -> None:

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
    sender_name = os.getenv("SMTP_FROM_NAME", "AI Email Assistant")

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
    message["Subject"] = subject
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = recipient_email
    message.set_content(body)

    if ics_content:
        message["Content-Class"] = "urn:content-classes:calendarmessage"

        message.add_alternative(
            ics_content.decode("utf-8"),
            subtype="calendar",
            params={"method": "REQUEST", "charset": "UTF-8"},
        )

        message.get_payload()[-1].add_header(
            "Content-Disposition", "inline"
        )

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
