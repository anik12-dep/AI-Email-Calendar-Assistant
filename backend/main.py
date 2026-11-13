import sqlite3
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ollama import Client
from google_auth import router as google_auth_router
from google_calendar import router as google_calendar_router
from google_gmail import router as google_gmail_router
from fastapi.middleware.cors import CORSMiddleware

# ==============================
# FastAPI Configuration
# ==============================

app = FastAPI(
    title="AI Email Calendar Assistant",
    description="AI Assistant powered by FastAPI and Ollama",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(google_auth_router)
app.include_router(google_calendar_router)
app.include_router(google_gmail_router)

# ==============================
# Ollama Configuration
# ==============================

ollama_client = Client(host="http://localhost:11434")

AVAILABLE_MODELS = [
    "llama3.2",
]

selected_model = "llama3.2"


# ==============================
# Calendar Database
# ==============================

def initialize_calendar_db():
    conn = sqlite3.connect("calendar.db")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            location TEXT
        )
    """)

    conn.commit()
    conn.close()


# Initialize Calendar Database
initialize_calendar_db()


# ==============================
# Request Models
# ==============================

class ModelRequest(BaseModel):
    model: str


class ChatRequest(BaseModel):
    message: str


class EmailGenerateRequest(BaseModel):
    purpose: str
    recipient: str = "there"
    tone: str = "Professional"
    key_points: str = ""

class EmailSummarizeRequest(BaseModel):
    email_text: str

class EmailReplyRequest(BaseModel):
    received_email: str
    reply_instruction: str
    tone: str = "Professional"

class CalendarEventRequest(BaseModel):
    title: str
    description: str = ""
    start_time: datetime
    end_time: datetime
    location: str = ""

class SuggestTimeRequest(BaseModel):
    preferred_date: str
    duration_minutes: int = 60
    preferred_time_range: str = "09:00-17:00"

# ==============================
# Home Endpoint
# ==============================

@app.get("/")
def home():
    return {
        "message": "AI Email Calendar Assistant Backend is Running!"
    }


# ==============================
# Get Available Models
# ==============================

@app.get("/models")
def get_models():
    return {
        "available_models": AVAILABLE_MODELS,
        "selected_model": selected_model
    }


# ==============================
# Update AI Model
# ==============================

@app.post("/settings/model")
def update_model(request: ModelRequest):
    global selected_model

    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400,
            detail="Model not supported"
        )

    try:
        installed_models = ollama_client.list()

        installed_names = [
            model.model.split(":")[0]
            for model in installed_models.models
        ]

        if request.model not in installed_names:
            raise HTTPException(
                status_code=400,
                detail=f"{request.model} is not installed in Ollama"
            )

        selected_model = request.model

        return {
            "message": "Model updated successfully",
            "selected_model": selected_model
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Ollama: {str(e)}"
        )


# ==============================
# AI Chat Endpoint
# ==============================

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        response = ollama_client.chat(
            model=selected_model,
            messages=[
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        )

        return {
            "model": selected_model,
            "response": response.message.content
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI request failed: {str(e)}"
        )


# ==============================
# Email Generation Endpoint
# ==============================

@app.post("/email/generate")
def generate_email(request: EmailGenerateRequest):
    try:
        prompt = f"""
        You are a professional email writing assistant.

        Write a complete email based on these details:

        Purpose: {request.purpose}
        Recipient: {request.recipient}
        Tone: {request.tone}
        Key Points: {request.key_points}

        Requirements:
        1. Generate a suitable subject line.
        2. Write a clear and professional email.
        3. Include an appropriate greeting.
        4. Include a proper closing.
        5. Do not invent facts that were not provided.
        6. Return only the email with its subject.
        """

        response = ollama_client.chat(
            model=selected_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return {
            "email": response.message.content,
            "model": selected_model
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Email generation failed: {str(e)}"
        )

class EmailSummarizeRequest(BaseModel):
    email_text: str


@app.post("/email/summarize")
def summarize_email(request: EmailSummarizeRequest):
    try:
        prompt = f"""
        You are a professional email summarization assistant.

        Summarize the following email:

        {request.email_text}

        Requirements:
        1. Explain the main purpose.
        2. Highlight important information.
        3. Mention deadlines and dates.
        4. Identify required actions.
        5. Keep the summary short and clear.
        6. Do not invent information.
        """

        response = ollama_client.chat(
            model=selected_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return {
            "summary": response.message.content,
            "model": selected_model
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Email summarization failed: {str(e)}"
        )


# ==============================
# Email Reply Generation Endpoint
# ==============================

@app.post("/email/reply")
def generate_email_reply(request: EmailReplyRequest):
    try:
        prompt = f"""
        You are a professional email reply assistant.

        Read the received email and generate an appropriate reply.

        Received Email:
        {request.received_email}

        Reply Instruction:
        {request.reply_instruction}

        Tone:
        {request.tone}

        Requirements:
        1. Understand the received email.
        2. Follow the user's reply instruction.
        3. Use the requested tone.
        4. Write a clear and professional reply.
        5. Include an appropriate greeting and closing.
        6. Do not invent facts or commitments.
        7. Return only the email reply.
        """

        response = ollama_client.chat(
            model=selected_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return {
            "reply": response.message.content,
            "model": selected_model
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Email reply generation failed: {str(e)}"
        )


# ==============================
# Create Calendar Event
# ==============================

@app.post("/calendar/create-event")
def create_calendar_event(request: CalendarEventRequest):

    if request.start_time.tzinfo != request.end_time.tzinfo:
        raise HTTPException(
            status_code=400,
            detail="Start and end time must use the same timezone format"
        )

    if request.start_time >= request.end_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time"
        )

    try:
        conn = sqlite3.connect("calendar.db")
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO events
            (title, description, start_time, end_time, location)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                request.title,
                request.description,
                request.start_time.isoformat(),
                request.end_time.isoformat(),
                request.location
            )
        )

        event_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return {
            "message": "Calendar event created successfully",
            "event_id": event_id,
            "title": request.title,
            "start_time": request.start_time.isoformat(),
            "end_time": request.end_time.isoformat(),
            "location": request.location
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Calendar event creation failed: {str(e)}"
        )


# ==============================
# Get All Calendar Events
# ==============================

@app.get("/calendar/events")
def get_calendar_events():

    try:
        conn = sqlite3.connect("calendar.db")
        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM events
            ORDER BY start_time ASC
        """)

        rows = cursor.fetchall()

        events = [dict(row) for row in rows]

        conn.close()

        return {
            "total_events": len(events),
            "events": events
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve calendar events: {str(e)}"
        )


# ==============================
# AI Suggest Meeting Time
# ==============================

@app.post("/calendar/suggest-time")
def suggest_meeting_time(request: SuggestTimeRequest):

    if request.duration_minutes <= 0:
        raise HTTPException(
            status_code=400,
            detail="Duration must be greater than zero"
        )

    try:
        conn = sqlite3.connect("calendar.db")
        cursor = conn.cursor()

        cursor.execute("""
            SELECT title, start_time, end_time
            FROM events
            WHERE date(start_time) = date(?)
        """, (request.preferred_date,))

        existing_events = cursor.fetchall()
        conn.close()

        event_details = ""

        for event in existing_events:
            event_details += (
                f"Event: {event[0]}, "
                f"Start: {event[1]}, "
                f"End: {event[2]}\n"
            )

        if not event_details:
            event_details = "No existing events on this date."

        prompt = f"""
        You are an AI calendar scheduling assistant.

        Suggest a suitable meeting time using these details:

        Preferred Date: {request.preferred_date}
        Meeting Duration: {request.duration_minutes} minutes
        Preferred Time Range: {request.preferred_time_range}

        Existing Events:
        {event_details}

        Requirements:
        1. Suggest a time within the preferred time range.
        2. Avoid overlapping existing events.
        3. Consider the requested meeting duration.
        4. If no suitable slot exists, clearly say so.
        5. Do not invent existing events.
        6. Return a clear and concise suggestion.
        """

        response = ollama_client.chat(
            model=selected_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return {
            "suggestion": response.message.content,
            "model": selected_model
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Meeting time suggestion failed: {str(e)}"
        )
