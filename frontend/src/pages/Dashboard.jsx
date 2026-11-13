import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";

import {
  Mail,
  CalendarDays,
  Sparkles,
  Brain,
  Clock,
  MapPin,
  Video,
  ArrowRight,
  RefreshCw,
  CalendarCheck,
} from "lucide-react";

// Fetch dashboard data from API
async function getDashboardData() {
  const statusResponse = await API.get("/auth/google/status");
  const connected = statusResponse.data.connected;

  if (!connected) {
    return { connected: false, events: [] };
  }

  const response = await API.get("/google-calendar/events?max_results=100");

  return {
    connected: true,
    events: response.data.events || [],
  };
}

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard feature cards
  const cards = [
    {
      title: "Email Assistant",
      description: "Manage and organize your emails with AI.",
      icon: Mail,
      path: "/email",
    },
    {
      title: "Calendar Management",
      description: "Manage events and schedule meetings.",
      icon: CalendarDays,
      path: "/calendar",
    },
    {
      title: "Hugging Face",
      description: "AI models for classification and summarization.",
      icon: Brain,
      path: null,
    },
    {
      title: "Ollama AI",
      description: "Your local AI assistant powered by Llama 3.2.",
      icon: Sparkles,
      path: null,
    },
  ];

  // Bangladesh timezone date key
  const getDateKey = (date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  // Get event date
  const getEventDate = (event) => {
    if (event.start?.date) {
      return event.start.date;
    }

    if (event.start?.dateTime) {
      return getDateKey(new Date(event.start.dateTime));
    }

    return "";
  };

  // Get event starting time
  const getEventStart = (event) => {
    if (event.start?.dateTime) {
      return new Date(event.start.dateTime);
    }

    if (event.start?.date) {
      return new Date(`${event.start.date}T00:00:00+06:00`);
    }

    return null;
  };

  // Format event date
  const formatEventDate = (event) => {
    const date = getEventStart(event);

    if (!date || Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Dhaka",
    });
  };

  // Format event time
  const formatEventTime = (event) => {
    if (event.start?.date) {
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

  // Refresh dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDashboardData();

      setGoogleConnected(data.connected);
      setEvents(data.events);
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
      setError(err.response?.data?.detail || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data when component mounts
  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const data = await getDashboardData();

        if (cancelled) return;

        setGoogleConnected(data.connected);
        setEvents(data.events);
        setError("");
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);

        if (!cancelled) {
          setError(
            err.response?.data?.detail || "Unable to load dashboard data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Current date and time snapshot
  const now = new Date();
  const currentTime = now.getTime();
  const todayKey = getDateKey(now);

  // Today's meetings
  const todayEvents = events.filter(
    (event) => getEventDate(event) === todayKey,
  );

  // Upcoming events
  const upcomingEvents = events
    .filter((event) => {
      const start = getEventStart(event);
      return start && start.getTime() >= currentTime;
    })
    .sort((a, b) => getEventStart(a).getTime() - getEventStart(b).getTime())
    .slice(0, 5);

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <p className="welcome-text">PERSONAL AI WORKSPACE</p>
          <h1>Welcome to AssistAI 👋</h1>
          <p className="dashboard-subtitle">
            Your intelligent workspace for emails and calendar.
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Dashboard Statistics */}
      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon purple">
            <CalendarDays size={23} />
          </div>
          <div>
            <p>Today's Meetings</p>
            <h2>{loading ? "..." : todayEvents.length}</h2>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon blue">
            <CalendarCheck size={23} />
          </div>
          <div>
            <p>Upcoming Events</p>
            <h2>{loading ? "..." : upcomingEvents.length}</h2>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon green">
            <CalendarDays size={23} />
          </div>
          <div>
            <p>Google Calendar</p>
            <h2 className="connection-status">
              {loading
                ? "Checking..."
                : googleConnected
                  ? "Connected"
                  : "Not Connected"}
            </h2>
          </div>
        </div>
      </div>

      {/* Upcoming Meetings */}
      <div className="dashboard-upcoming">
        <div className="dashboard-section-header">
          <div>
            <h2>Upcoming Meetings</h2>
            <p>Your next scheduled events.</p>
          </div>

          <Link to="/calendar" className="dashboard-view-all">
            View Calendar <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="dashboard-empty">Loading your calendar events...</div>
        ) : error ? (
          <div className="dashboard-empty dashboard-error">{error}</div>
        ) : !googleConnected ? (
          <div className="dashboard-empty">
            <CalendarDays size={35} />
            <h3>Connect Google Calendar</h3>
            <p>Connect your Google Calendar to see your upcoming meetings.</p>
            <Link to="/calendar" className="dashboard-connect-link">
              Go to Calendar <ArrowRight size={15} />
            </Link>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="dashboard-empty">
            <CalendarCheck size={35} />
            <h3>No Upcoming Events</h3>
            <p>You don't have any upcoming scheduled events.</p>
          </div>
        ) : (
          <div className="dashboard-event-list">
            {upcomingEvents.map((event) => (
              <div className="dashboard-event-card" key={event.id}>
                <div className="dashboard-event-icon">
                  <CalendarDays size={21} />
                </div>

                <div className="dashboard-event-info">
                  <h3>{event.summary || "Untitled Event"}</h3>

                  <div className="dashboard-event-meta">
                    <span>
                      <CalendarDays size={14} />
                      {formatEventDate(event)}
                    </span>

                    <span>
                      <Clock size={14} />
                      {formatEventTime(event)}
                    </span>

                    <span>
                      {event.hangoutLink ? (
                        <Video size={14} />
                      ) : (
                        <MapPin size={14} />
                      )}
                      {event.location ||
                        (event.hangoutLink ? "Google Meet" : "No location")}
                    </span>
                  </div>
                </div>

                <span className="dashboard-event-badge">Upcoming</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace Feature Cards */}
      <div className="dashboard-feature-heading">
        <h2>Explore Your Workspace</h2>
        <p>Everything you need in one place.</p>
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          const cardContent = (
            <>
              <div className="card-icon">
                <Icon size={25} />
              </div>

              <h3>{card.title}</h3>
              <p>{card.description}</p>

              {card.path && (
                <span className="dashboard-card-action">
                  Open Feature <ArrowRight size={15} />
                </span>
              )}
            </>
          );

          return card.path ? (
            <Link
              to={card.path}
              className="dashboard-card dashboard-card-link"
              key={card.title}
            >
              {cardContent}
            </Link>
          ) : (
            <div className="dashboard-card" key={card.title}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
