import { useState, useEffect } from "react";
import API from "../api";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Video,
  Pencil,
  Trash2,
} from "lucide-react";

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventError, setEventError] = useState("");

  const [connectionMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search);

    return params.get("google_connected") === "true"
      ? "Google Calendar connected successfully!"
      : "";
  });

  const [connectionError, setConnectionError] = useState("");

  // Create Event Modal States
  const getTodayLocal = () => {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const [showCreateEvent, setShowCreateEvent] = useState(false);

  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    date: getTodayLocal(),
    startTime: "09:00",
    endTime: "10:00",
  });

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState("");
  const [createEventSuccess, setCreateEventSuccess] = useState("");
  // Edit Event Modal States
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const [editEvent, setEditEvent] = useState({
    summary: "",
    description: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
  });

  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [editEventError, setEditEventError] = useState("");

  // Delete Event States
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [deleteEventError, setDeleteEventError] = useState("");

  // Convert a date into YYYY-MM-DD using Bangladesh timezone
  const getDateKey = (date) => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  // Format Google Calendar event time
  const formatEventTime = (event) => {
    if (event.start?.date && event.end?.date) {
      return "All day";
    }

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    const options = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka",
    };

    const startTime = start.toLocaleTimeString("en-US", options);
    const endTime = end.toLocaleTimeString("en-US", options);

    return `${startTime} - ${endTime}`;
  };

  // Get the event date in Bangladesh timezone
  const getEventDate = (event) => {
    if (event.start?.date) {
      return event.start.date;
    }

    if (event.start?.dateTime) {
      return getDateKey(new Date(event.start.dateTime));
    }

    return "";
  };

  // Fetch real events from Google Calendar
  const fetchGoogleEvents = async () => {
    try {
      setLoadingEvents(true);
      setEventError("");

      const response = await API.get("/google-calendar/events?max_results=100");

      setEvents(response.data.events || []);
    } catch (error) {
      console.error("Google Calendar events fetch failed:", error);

      setEventError(
        error.response?.data?.detail ||
          "Unable to load Google Calendar events.",
      );
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

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
        summary: newEvent.summary,
        description: newEvent.description,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        timezone: "Asia/Dhaka",
      };

      await API.post("/google-calendar/create-event", payload);

      setCreateEventSuccess("Event created successfully in Google Calendar!");

      setShowCreateEvent(false);

      setNewEvent({
        summary: "",
        description: "",
        date: getTodayLocal(),
        startTime: "09:00",
        endTime: "10:00",
      });

      await fetchGoogleEvents();
    } catch (error) {
      console.error("Event creation failed:", error);

      setCreateEventError(
        error.response?.data?.detail ||
          "Unable to create Google Calendar event.",
      );
    } finally {
      setCreatingEvent(false);
    }
  };
  // Open Edit Event Modal
  const handleOpenEditEvent = (event) => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);

    const getDhakaTime = (date) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(date);

    setEditingEventId(event.id);

    setEditEvent({
      summary: event.summary || "",
      description: event.description || "",
      date: getDateKey(start),
      startTime: getDhakaTime(start),
      endTime: getDhakaTime(end),
    });

    setEditEventError("");
    setShowEditEvent(true);
  };

  // Update Event
  const handleUpdateEvent = async (e) => {
    e.preventDefault();

    try {
      setUpdatingEvent(true);
      setEditEventError("");

      const startDateTime = new Date(
        `${editEvent.date}T${editEvent.startTime}:00`,
      );

      const endDateTime = new Date(`${editEvent.date}T${editEvent.endTime}:00`);

      if (endDateTime <= startDateTime) {
        setEditEventError("End time must be after start time.");
        return;
      }

      const payload = {
        summary: editEvent.summary,
        description: editEvent.description,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        timezone: "Asia/Dhaka",
      };

      await API.put(`/google-calendar/events/${editingEventId}`, payload);

      setShowEditEvent(false);
      setEditingEventId(null);

      await fetchGoogleEvents();
    } catch (error) {
      console.error("Event update failed:", error);

      setEditEventError(
        error.response?.data?.detail ||
          "Unable to update Google Calendar event.",
      );
    } finally {
      setUpdatingEvent(false);
    }
  };
  // Open Delete Confirmation
  const handleOpenDeleteConfirm = (event) => {
    setEventToDelete(event);
    setDeleteEventError("");
  };

  // Delete Event
  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      setDeletingEvent(true);
      setDeleteEventError("");

      await API.delete(`/google-calendar/events/${eventToDelete.id}`);

      setEventToDelete(null);

      await fetchGoogleEvents();
    } catch (error) {
      console.error("Event deletion failed:", error);

      setDeleteEventError(
        error.response?.data?.detail ||
          "Unable to delete Google Calendar event.",
      );
    } finally {
      setDeletingEvent(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("google_connected") === "true") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const initializeCalendar = async () => {
      try {
        const response = await API.get("/auth/google/status");

        setGoogleConnected(response.data.connected);

        if (response.data.connected) {
          await fetchGoogleEvents();
        } else {
          setLoadingEvents(false);
        }
      } catch (error) {
        console.error("Google status check failed:", error);
        setLoadingEvents(false);
      }
    };

    initializeCalendar();
  }, []);

  const handleGoogleConnect = async () => {
    try {
      setConnectingGoogle(true);
      setConnectionError("");

      const response = await API.get("/auth/google/login");

      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error("Google connection failed:", error);

      setConnectionError(
        error.response?.data?.detail || "Unable to connect Google Calendar.",
      );

      setConnectingGoogle(false);
    }
  };

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

  // Show only events belonging to the selected date
  const selectedEvents = events.filter(
    (event) => getEventDate(event) === selectedDateKey,
  );

  // Dates that contain Google Calendar events
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

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="add-event-button"
            onClick={handleGoogleConnect}
            disabled={connectingGoogle}
          >
            {connectingGoogle
              ? "Connecting..."
              : googleConnected
                ? "Google Connected ✓"
                : "Connect Google Calendar"}
          </button>

          <button
            className="add-event-button"
            onClick={() => setShowCreateEvent(true)}
          >
            <Plus size={18} />
            Add Event
          </button>
        </div>
      </div>

      {connectionMessage && (
        <p style={{ color: "green", margin: "12px 0" }}>{connectionMessage}</p>
      )}

      {connectionError && (
        <p style={{ color: "red", margin: "12px 0" }}>{connectionError}</p>
      )}

      {createEventSuccess && (
        <p style={{ color: "green", margin: "12px 0" }}>{createEventSuccess}</p>
      )}

      {showCreateEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <h2>Create New Event</h2>

            <form onSubmit={handleCreateEvent}>
              <label>Event Title</label>
              <input
                type="text"
                placeholder="Enter event title"
                value={newEvent.summary}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    summary: e.target.value,
                  })
                }
                required
              />

              <label>Description</label>
              <textarea
                placeholder="Enter event description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    description: e.target.value,
                  })
                }
              />

              <label>Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    date: e.target.value,
                  })
                }
                required
              />

              <label>Start Time</label>
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    startTime: e.target.value,
                  })
                }
                required
              />

              <label>End Time</label>
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    endTime: e.target.value,
                  })
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
                >
                  Cancel
                </button>

                <button type="submit" disabled={creatingEvent}>
                  {creatingEvent ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <h2>Edit Event</h2>

            <form onSubmit={handleUpdateEvent}>
              <label>Event Title</label>

              <input
                type="text"
                placeholder="Enter event title"
                value={editEvent.summary}
                onChange={(e) =>
                  setEditEvent({
                    ...editEvent,
                    summary: e.target.value,
                  })
                }
                required
              />

              <label>Description</label>

              <textarea
                placeholder="Enter event description"
                value={editEvent.description}
                onChange={(e) =>
                  setEditEvent({
                    ...editEvent,
                    description: e.target.value,
                  })
                }
              />

              <label>Date</label>

              <input
                type="date"
                value={editEvent.date}
                onChange={(e) =>
                  setEditEvent({
                    ...editEvent,
                    date: e.target.value,
                  })
                }
                required
              />

              <label>Start Time</label>

              <input
                type="time"
                value={editEvent.startTime}
                onChange={(e) =>
                  setEditEvent({
                    ...editEvent,
                    startTime: e.target.value,
                  })
                }
                required
              />

              <label>End Time</label>

              <input
                type="time"
                value={editEvent.endTime}
                onChange={(e) =>
                  setEditEvent({
                    ...editEvent,
                    endTime: e.target.value,
                  })
                }
                required
              />

              {editEventError && (
                <p style={{ color: "red" }}>{editEventError}</p>
              )}

              <div className="event-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEvent(false);
                    setEditEventError("");
                  }}
                  disabled={updatingEvent}
                >
                  Cancel
                </button>

                <button type="submit" disabled={updatingEvent}>
                  {updatingEvent ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <h2>Delete Event?</h2>

            <p>
              Are you sure you want to delete
              <strong> {eventToDelete.summary}</strong>?
            </p>

            <p style={{ color: "#e57373", fontSize: "13px" }}>
              This action cannot be undone.
            </p>

            {deleteEventError && (
              <p style={{ color: "red" }}>{deleteEventError}</p>
            )}

            <div className="event-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setEventToDelete(null);
                  setDeleteEventError("");
                }}
                disabled={deletingEvent}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
              >
                {deletingEvent ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
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
              <p>Loading Google Calendar events...</p>
            ) : eventError ? (
              <p style={{ color: "red" }}>{eventError}</p>
            ) : !googleConnected ? (
              <p>Connect your Google Calendar to see your events.</p>
            ) : selectedEvents.length === 0 ? (
              <p>No events scheduled for this date.</p>
            ) : (
              selectedEvents.map((event) => (
                <div className="event-card" key={event.id}>
                  <div className="event-card-top">
                    <span className="event-type meeting">Google Calendar</span>

                    <div className="event-action-buttons">
                      {event.start?.dateTime && (
                        <button
                          type="button"
                          className="event-edit-button"
                          onClick={() => handleOpenEditEvent(event)}
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        className="event-delete-button"
                        onClick={() => handleOpenDeleteConfirm(event)}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </div>

                  <h3>{event.summary || "Untitled Event"}</h3>

                  <p>
                    <Clock size={14} />
                    {formatEventTime(event)}
                  </p>

                  <p>
                    {event.hangoutLink ? (
                      <Video size={14} />
                    ) : (
                      <MapPin size={14} />
                    )}

                    {event.location ||
                      (event.hangoutLink ? "Google Meet" : "No location")}
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
