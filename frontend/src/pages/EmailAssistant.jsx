import { useState, useEffect, useCallback } from "react";
import API from "../api";
import {
  Sparkles,
  Send,
  Mail,
  RefreshCw,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function EmailAssistant() {
  const [prompt, setPrompt] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [draft, setDraft] = useState(null);

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sentEmails, setSentEmails] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [selectedSentEmail, setSelectedSentEmail] = useState(null);

  const fetchSentEmails = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await API.get("/email/sent");
      setSentEmails(response.data.emails || []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.detail || "Could not load sent email history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSentEmails();
  }, [fetchSentEmails]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe the email you want to write.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");
    setDraft(null);

    try {
      const response = await API.post("/email/compose", {
        prompt: prompt.trim(),
        recipient_email: recipientInput.trim(),
      });

      if (response.data.recipient_required) {
        setError("Please enter the recipient's email address below.");
        return;
      }

      setDraft({
        recipient_email: response.data.recipient_email,
        subject: response.data.subject,
        body: response.data.body,
      });

      setRecipientInput(response.data.recipient_email);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Email generation failed. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!draft) return;

    if (
      !window.confirm(
        `Are you sure you want to send this email to ${draft.recipient_email}?`
      )
    ) {
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await API.post("/email/send", {
        recipient_email: draft.recipient_email,
        subject: draft.subject,
        body: draft.body,
      });

      setSuccess(response.data.message || "Email sent successfully!");
      setDraft(null);
      setPrompt("");
      setRecipientInput("");
      await fetchSentEmails();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to send email. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="email-page ai-compose-page">
      <div className="email-header">
        <div>
          <p className="welcome-text">AI POWERED EMAIL</p>
          <h1>Email Assistant</h1>
          <p className="dashboard-subtitle">
            Describe your email. Let AI write it. Review and send it.
          </p>
        </div>

        <div className="email-service-status">
          <Mail size={18} />
          <span>SMTP Email Service</span>
        </div>
      </div>

      <div className="ai-email-layout">
        <section className="ai-compose-panel">
          <div className="ai-panel-heading">
            <div className="ai-heading-icon">
              <Sparkles size={21} />
            </div>
            <div>
              <h2>Compose with AI</h2>
              <p>Tell AI what kind of email you want to send.</p>
            </div>
          </div>

          <label className="ai-field-label" htmlFor="email-prompt">
            Your instruction
          </label>

          <textarea
            id="email-prompt"
            className="ai-email-input ai-prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Send a professional email to rahim@gmail.com. Tell him that our project meeting is scheduled for tomorrow at 10 AM."
            rows={5}
          />

          <label className="ai-field-label" htmlFor="recipient-email">
            Recipient email address
          </label>

          <input
            id="recipient-email"
            className="ai-email-input"
            type="email"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder="recipient@example.com"
          />

          <button
            className="ai-generate-email-button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            <Sparkles size={18} />
            {generating ? "Generating Email..." : "Generate Email"}
          </button>

          {error && (
            <div className="ai-email-alert error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="ai-email-alert success">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <div className="ai-compose-note">
            <AlertCircle size={17} />
            <p>
              AI will only prepare a draft. No email is sent until you review
              it and click Send Email.
            </p>
          </div>
        </section>

        <section className="ai-preview-panel">
          <div className="ai-panel-heading">
            <div className="ai-heading-icon preview-icon">
              <FileText size={21} />
            </div>
            <div>
              <h2>Email Preview</h2>
              <p>Review and edit your email before sending.</p>
            </div>
          </div>

          {draft ? (
            <div className="ai-email-draft">
              <div className="ai-draft-field">
                <label htmlFor="draft-recipient">To</label>
                <input
                  id="draft-recipient"
                  type="email"
                  value={draft.recipient_email}
                  onChange={(e) =>
                    setDraft({ ...draft, recipient_email: e.target.value })
                  }
                />
              </div>

              <div className="ai-draft-field">
                <label htmlFor="draft-subject">Subject</label>
                <input
                  id="draft-subject"
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value })
                  }
                />
              </div>

              <div className="ai-draft-field">
                <label htmlFor="draft-body">Message</label>
                <textarea
                  id="draft-body"
                  rows={12}
                  value={draft.body}
                  onChange={(e) =>
                    setDraft({ ...draft, body: e.target.value })
                  }
                />
              </div>

              <button
                className="ai-send-email-button"
                onClick={handleSend}
                disabled={
                  sending ||
                  !draft.recipient_email.trim() ||
                  !draft.subject.trim() ||
                  !draft.body.trim()
                }
              >
                <Send size={17} />
                {sending ? "Sending Email..." : "Send Email"}
              </button>
            </div>
          ) : (
            <div className="ai-empty-preview">
              <div className="ai-empty-icon">
                <Mail size={34} />
              </div>
              <h3>Your email draft will appear here</h3>
              <p>
                Write your instruction and click Generate Email to create your
                first AI email draft.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="ai-sent-history">
        <div className="ai-history-heading">
          <div>
            <h2>
              <Clock size={20} />
              Sent Email History
            </h2>
            <p>Your recently sent emails.</p>
          </div>

          <button
            className="ai-history-refresh"
            onClick={fetchSentEmails}
            disabled={historyLoading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <p className="ai-history-empty">Loading sent emails...</p>
        ) : historyError ? (
          <p className="ai-history-empty">{historyError}</p>
        ) : sentEmails.length === 0 ? (
          <div className="ai-history-empty">
            <Mail size={27} />
            <p>No sent emails yet. Your sent emails will appear here.</p>
          </div>
        ) : (
          <div className="ai-history-list">
            {sentEmails.map((email) => (
              <button
                key={email.id}
                className={
                  selectedSentEmail?.id === email.id
                    ? "ai-history-item selected"
                    : "ai-history-item"
                }
                onClick={() =>
                  setSelectedSentEmail(
                    selectedSentEmail?.id === email.id ? null : email
                  )
                }
              >
                <div className="ai-history-avatar">
                  <Mail size={18} />
                </div>

                <div className="ai-history-content">
                  <strong>{email.subject}</strong>
                  <span>To: {email.recipient_email}</span>
                  <small>{formatDate(email.sent_at)}</small>

                  {selectedSentEmail?.id === email.id && (
                    <div className="ai-history-detail">
                      <p>{email.body}</p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default EmailAssistant;
