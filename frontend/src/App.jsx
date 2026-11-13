import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { ThemeContext } from "./ThemeContext";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import EmailAssistant from "./pages/EmailAssistant";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import OllamaAI from "./pages/OllamaAI";

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/email" element={<EmailAssistant />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ollama" element={<OllamaAI />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeContext.Provider>
  );
}

export default App;
