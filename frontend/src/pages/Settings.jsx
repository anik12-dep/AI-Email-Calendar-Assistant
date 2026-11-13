import { useState, useContext } from "react";
import { User, Brain, Bell, Palette, Save, Cpu, Sparkles } from "lucide-react";

import { ThemeContext } from "../ThemeContext";

const defaultSettings = {
  displayName: "AI User",
  email: "",
  model: "llama3.2",
  notifications: true,
  emailAlerts: true,
};

function Settings() {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  // Load saved settings from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem("appSettings");

      return savedSettings
        ? { ...defaultSettings, ...JSON.parse(savedSettings) }
        : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [savedMessage, setSavedMessage] = useState("");

  // Update settings
  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSavedMessage("");
  };

  // Save settings
  const handleSave = () => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));

      setSavedMessage("Settings saved successfully!");
    } catch {
      setSavedMessage("Unable to save settings. Please try again.");
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <p className="welcome-text">PREFERENCES</p>
          <h1>Settings</h1>
          <p className="dashboard-subtitle">
            Manage your profile, AI models and application preferences.
          </p>
        </div>

        <button className="save-settings-button" onClick={handleSave}>
          <Save size={17} />
          Save Settings
        </button>
      </div>

      {savedMessage && (
        <p role="status" aria-live="polite">
          {savedMessage}
        </p>
      )}

      <div className="settings-container">
        {/* Profile Settings */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <User size={21} />
            <div>
              <h2>Profile Settings</h2>
              <p>Your personal account information.</p>
            </div>
          </div>

          <div className="settings-field">
            <label>Display Name</label>
            <input
              type="text"
              value={settings.displayName}
              onChange={(e) => handleChange("displayName", e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="settings-field">
            <label>Email Address</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter your email address"
            />
          </div>
        </section>

        {/* AI Model Configuration */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <Brain size={21} />
            <div>
              <h2>AI Model Configuration</h2>
              <p>Choose your preferred AI assistant model.</p>
            </div>
          </div>

          <div className="settings-field">
            <label>Primary AI Model</label>
            <select
              value={settings.model}
              onChange={(e) => handleChange("model", e.target.value)}
            >
              <option value="llama3.2">Llama 3.2 (Ollama)</option>
              <option value="llama3.1">Llama 3.1 (Ollama)</option>
            </select>
          </div>

          <div className="model-status-list">
            <div className="model-status">
              <div className="model-icon">
                <Cpu size={21} />
              </div>
              <div className="model-info">
                <strong>Ollama</strong>
                <span>Local AI model runtime</span>
              </div>
              <span className="status-badge">Configured target</span>
            </div>

            <div className="model-status">
              <div className="model-icon">
                <Sparkles size={21} />
              </div>
              <div className="model-info">
                <strong>Hugging Face</strong>
                <span>Transformers and NLP models</span>
              </div>
              <span className="status-badge pending">Planned</span>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <Bell size={21} />
            <div>
              <h2>Notifications</h2>
              <p>Manage your notification preferences.</p>
            </div>
          </div>

          <div className="setting-toggle-row">
            <div>
              <strong>Enable Notifications</strong>
              <p>Receive application notifications.</p>
            </div>

            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => handleChange("notifications", e.target.checked)}
            />
          </div>

          <div className="setting-toggle-row">
            <div>
              <strong>Email Notifications</strong>
              <p>Receive email-related alerts.</p>
            </div>

            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(e) => handleChange("emailAlerts", e.target.checked)}
            />
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <Palette size={21} />
            <div>
              <h2>Appearance</h2>
              <p>Customize your workspace appearance.</p>
            </div>
          </div>

          <div className="setting-toggle-row">
            <div>
              <strong>Dark Mode</strong>
              <p>Enable dark appearance for your workspace.</p>
            </div>

            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
