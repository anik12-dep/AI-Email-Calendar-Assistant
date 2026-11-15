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

// Fetch visitor's own calendar events
async function getDashboardData() {
  const response = await API.get("/calendar/events");
  return { events: response.data.events || [] };
}

function Dashboard() {
  const [events, setEvents] = useState([]);
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
  const getEventDate = (event) =>
    event.start_time ? getDateKey(new Date(event.start_time)) : "";

  // Get event starting time
  const getEventStart = (event) =>
    event.start_time ? new Date(event.start_time) : null;

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

  // Refresh dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDashboardData();

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
            <p>Saved Events</p>
            <h2>{loading ? "..." : events.length}</h2>
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
                  <h3>{event.title || "Untitled Event"}</h3>

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
                      <MapPin size={14} />
                      {event.location || "No location"}
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
