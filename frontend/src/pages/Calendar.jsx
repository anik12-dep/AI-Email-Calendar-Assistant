import { useState, useEffect } from "react";
import API from "../api";
import { getGoogleAuthUrl, getGoogleAuthStatus } from "../services";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Mail,
} from "lucide-react";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventError, setEventError] = useState("");

  const getTodayLocal = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    recipientEmail: "",
    date: getTodayLocal(),
    startTime: "09:00",
    endTime: "10:00",
  });

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState("");
  const [createEventSuccess, setCreateEventSuccess] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState("");

  const getDateKey = (date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const formatEventTime = (event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    const options = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    };

    return `${start.toLocaleTimeString("en-US", options)} - ${end.toLocaleTimeString("en-US", options)}`;
  };

  const getEventDate = (event) =>
    event.start_time ? getDateKey(new Date(event.start_time)) : "";

  const fetchCalendarEvents = async () => {
    try {
      const response = await API.get("/calendar/events");
      setEvents(response.data.events || []);
      setEventError("");
    } catch (error) {
      console.error("Calendar events fetch failed:", error);
      setEventError(
        error.response?.data?.detail || "Unable to load calendar events.",
      );
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setConnectingGoogle(true);
      setGoogleAuthError("");

      const authData = await getGoogleAuthUrl();

      if (!authData.authorization_url) {
        throw new Error("Google authorization URL was not returned.");
      }

      window.location.assign(authData.authorization_url);
    } catch (error) {
      setGoogleAuthError(
        error.response?.data?.detail ||
          error.message ||
          "Unable to connect Google account.",
      );
      setConnectingGoogle(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    if (!googleConnected) {
      setCreateEventError("Please connect your Google account first.");
      return;
    }

    try {
      setCreatingEvent(true);
      setCreateEventError("");
      setCreateEventSuccess("");

      const startDateTime = new Date(
        `${newEvent.date}T${newEvent.startTime}:00`,
      );
      const endDateTime = new Date(`${newEvent.date}T${newEvent.endTime}:00`);

      if (endDateTime <= startDateTime) {
        setCreateEventError("End time must be after start time.");
        return;
      }

      const payload = {
        title: newEvent.summary,
        description: newEvent.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: "",
        recipient_email: newEvent.recipientEmail.trim(),
      };

      await API.post("/calendar/send-invitation", payload);

      setCreateEventSuccess(
        "Google Calendar invitation sent successfully! Check the recipient’s email for the calendar invitation.",
      );

      setShowCreateEvent(false);

      setNewEvent({
        summary: "",
        description: "",
        recipientEmail: "",
        date: getTodayLocal(),
        startTime: "09:00",
        endTime: "10:00",
      });

      await fetchCalendarEvents();
    } catch (error) {
      console.error("Invitation sending failed:", error);
      setCreateEventError(
        error.response?.data?.detail || "Unable to send calendar invitation.",
      );
    } finally {
      setCreatingEvent(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchCalendarEvents();

      try {
        const status = await getGoogleAuthStatus();
        setGoogleConnected(Boolean(status.connected));
      } catch (error) {
        console.error("Google connection status check failed:", error);
        setGoogleConnected(false);
      }
    };

    loadData();
  }, []);

  const changeMonth = (direction) => {
    setCurrentDate(
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + direction,
        1,
      ),
    );
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedDateKey = getDateKey(selectedDate);

  const selectedEvents = events.filter(
    (event) => getEventDate(event) === selectedDateKey,
  );

  const eventDates = new Set(events.map(getEventDate));

  const isSelected = (day) =>
    day &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  const today = new Date();

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div>
          <p className="welcome-text">SCHEDULE MANAGEMENT</p>
          <h1>Calendar Management</h1>
          <p className="dashboard-subtitle">
            Organize your meetings, events and daily activities.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="add-event-button"
            onClick={handleGoogleConnect}
            disabled={connectingGoogle}
          >
            <Mail size={18} />
            {connectingGoogle
              ? "Connecting..."
              : googleConnected
                ? "Google Connected"
                : "Connect Gmail"}
          </button>

          <button
            className="add-event-button"
            onClick={() => {
              setCreateEventError("");
              setCreateEventSuccess("");
              setShowCreateEvent(true);
            }}
          >
            <Plus size={18} />
            Add Event
          </button>
        </div>
      </div>

      {googleAuthError && (
        <p style={{ color: "red", margin: "12px 0" }}>{googleAuthError}</p>
      )}

      {!googleConnected && (
        <p style={{ margin: "12px 0", color: "#b7791f" }}>
          Connect your Gmail account before sending calendar invitations.
        </p>
      )}

      {createEventSuccess && (
        <p style={{ color: "green", margin: "12px 0" }}>{createEventSuccess}</p>
      )}

      {showCreateEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <h2>Create Calendar Invitation</h2>

            <form onSubmit={handleCreateEvent}>
              <label>Event Title</label>
              <input
                type="text"
                placeholder="Enter event title"
                value={newEvent.summary}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, summary: e.target.value })
                }
                required
              />

              <label>Description</label>
              <textarea
                placeholder="Enter event description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
              />

              <label>Recipient Email</label>
              <input
                type="email"
                placeholder="Enter recipient email address"
                value={newEvent.recipientEmail}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    recipientEmail: e.target.value,
                  })
                }
                required
              />

              <label>Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: e.target.value })
                }
                required
              />

              <label>Start Time</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, startTime: e.target.value })
                }
                required
              />

              <label>End Time</label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, endTime: e.target.value })
                }
                required
              />

              {createEventError && (
                <p style={{ color: "red" }}>{createEventError}</p>
              )}

              <div className="event-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateEvent(false);
                    setCreateEventError("");
                  }}
                  disabled={creatingEvent}
                >
                  Cancel
                </button>

                <button type="submit" disabled={creatingEvent}>
                  {creatingEvent ? "Sending Invitation..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="calendar-layout">
        <section className="calendar-main">
          <div className="month-header">
            <div>
              <h2>
                {currentDate.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p>Manage your schedule</p>
            </div>

            <div className="month-navigation">
              <button onClick={() => changeMonth(-1)}>
                <ChevronLeft size={19} />
              </button>

              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDate(new Date());
                }}
              >
                Today
              </button>

              <button onClick={() => changeMonth(1)}>
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div className="calendar-weekday" key={day}>
                {day}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              const dateKey = day ? getDateKey(new Date(year, month, day)) : "";

              return (
                <button
                  key={index}
                  disabled={!day}
                  className={[
                    "calendar-day",
                    !day ? "empty" : "",
                    isSelected(day) ? "selected-day" : "",
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()
                      ? "today"
                      : "",
                  ].join(" ")}
                  onClick={() =>
                    day && setSelectedDate(new Date(year, month, day))
                  }
                >
                  {day && (
                    <>
                      <span>{day}</span>
                      {eventDates.has(dateKey) && (
                        <span className="event-dot" />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="upcoming-panel">
          <div className="upcoming-heading">
            <div>
              <h2>Upcoming Events</h2>
              <p>Your scheduled activities</p>
            </div>
            <CalendarDays size={22} />
          </div>

          <div className="selected-date">
            <span>SELECTED DATE</span>
            <h3>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Dhaka",
              })}
            </h3>
          </div>

          <div className="event-list">
            {loadingEvents ? (
              <p>Loading calendar events...</p>
            ) : eventError ? (
              <p style={{ color: "red" }}>{eventError}</p>
            ) : selectedEvents.length === 0 ? (
              <p>No events scheduled for this date.</p>
            ) : (
              selectedEvents.map((event) => (
                <div className="event-card" key={event.id}>
                  <div className="event-card-top">
                    <span className="event-type meeting">
                      <Mail size={13} /> Email Invitation
                    </span>
                  </div>

                  <h3>{event.title || "Untitled Event"}</h3>

                  <p>
                    <Clock size={14} />
                    {formatEventTime(event)}
                  </p>

                  <p>
                    <MapPin size={14} />
                    {event.location || "No location"}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Calendar;
