import API from "./api";

// Google OAuth
export const getGoogleAuthUrl = async () => {
  const response = await API.get("/auth/google/login");
  return response.data;
};

export const getGoogleAuthStatus = async () => {
  const response = await API.get("/auth/google/status");
  return response.data;
};

// Fetch Google Calendar Events
export const getCalendarEvents = async (maxResults = 100) => {
  const response = await API.get("/google-calendar/events", {
    params: { max_results: maxResults },
  });

  return response.data;
};

// Create Google Calendar Event
export const createCalendarEvent = async (eventData) => {
  const response = await API.post("/google-calendar/create-event", eventData);

  return response.data;
};

// Update Google Calendar Event
export const updateCalendarEvent = async (eventId, eventData) => {
  const response = await API.put(
    `/google-calendar/events/${eventId}`,
    eventData,
  );

  return response.data;
};

// Delete Google Calendar Event
export const deleteCalendarEvent = async (eventId) => {
  const response = await API.delete(`/google-calendar/events/${eventId}`);

  return response.data;
};
