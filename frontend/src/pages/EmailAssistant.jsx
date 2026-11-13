import { useState, useEffect, useCallback } from "react";
import API from "../api";
import {
  Search,
  Mail,
  Star,
  Sparkles,
  Send,
  Inbox,
  Archive,
  Trash2,
  RefreshCw,
} from "lucide-react";

function EmailAssistant() {
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [activeCategory, setActiveCategory] = useState("Primary");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [replyInstruction, setReplyInstruction] = useState("");
  const [replyTone, setReplyTone] = useState("Professional");
  const [generatedReply, setGeneratedReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const categories = ["Primary", "Social", "Promotions", "Updates"];

  const fetchEmails = useCallback(async () => {
    try {
      const response = await API.get(
        `/gmail/messages?category=${activeFolder}&max_results=20`,
      );

      const formattedEmails = response.data.emails.map((email) => ({
        ...email,
        sender:
          email.sender.split("<")[0].replace(/"/g, "").trim() || email.sender,
        email: email.sender.match(/<(.+)>/)?.[1] || email.sender,
        preview: email.snippet || "",
        time: email.date || "",
        category: "Primary",
      }));

      setEmails(formattedEmails);

      setSelectedEmail(formattedEmails.length > 0 ? formattedEmails[0] : null);

      setError("");
    } catch (err) {
      console.error("Gmail fetch error:", err);
      setError(err.response?.data?.detail || "Failed to load Gmail messages.");
    } finally {
      setLoading(false);
    }
  }, [activeFolder]);

  const handleSummarize = async () => {
    if (!selectedEmail) return;

    if (showAI) {
      setShowAI(false);
      return;
    }

    setShowAI(true);
    setAiSummary("");
    setSummaryError("");
    setSummaryLoading(true);

    try {
      const response = await API.post("/email/summarize", {
        email_text: selectedEmail.body || selectedEmail.preview || "",
      });

      setAiSummary(response.data.summary);
    } catch (err) {
      console.error("AI Summary Error:", err);

      setSummaryError(
        err.response?.data?.detail ||
          "Failed to generate AI summary. Please try again.",
      );
    } finally {
      setSummaryLoading(false);
    }
  };
  const handleGenerateReply = async () => {
    if (!selectedEmail) return;

    if (!replyInstruction.trim()) {
      setReplyError("Please enter your reply instruction.");
      return;
    }

    setReplyLoading(true);
    setReplyError("");
    setGeneratedReply("");

    try {
      const response = await API.post("/email/reply", {
        received_email: selectedEmail.body || selectedEmail.preview || "",
        reply_instruction: replyInstruction,
        tone: replyTone,
      });

      setGeneratedReply(response.data.reply);
    } catch (err) {
      console.error("AI Reply Error:", err);

      setReplyError(
        err.response?.data?.detail ||
          "Failed to generate AI reply. Please try again.",
      );
    } finally {
      setReplyLoading(false);
    }
  };
  const handleSendReply = async () => {
    if (!selectedEmail || !generatedReply.trim()) {
      setSendError("Please generate a reply before sending.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this reply to ${selectedEmail.email}?`,
    );

    if (!confirmed) return;

    setSendLoading(true);
    setSendError("");
    setSendSuccess("");

    try {
      const response = await API.post("/gmail/reply", {
        message_id: selectedEmail.id,
        reply_body: generatedReply,
      });

      setSendSuccess(response.data.message || "Reply sent successfully!");

      setGeneratedReply("");
    } catch (err) {
      console.error("Gmail Send Reply Error:", err);

      setSendError(
        err.response?.data?.detail || "Failed to send reply. Please try again.",
      );
    } finally {
      setSendLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadEmails = async () => {
      if (isActive) {
        await fetchEmails();
      }
    };

    const timeoutId = setTimeout(loadEmails, 0);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [fetchEmails]);

  const filteredEmails = emails.filter((email) => {
    const matchesCategory = email.category === activeCategory;

    const matchesSearch =
      email.sender.toLowerCase().includes(search.toLowerCase()) ||
      email.subject.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });
  return (
    <div className="email-page">
      <div className="email-header">
        <div>
          <p className="welcome-text">EMAIL MANAGEMENT</p>
          <h1>Email Assistant</h1>
          <p className="dashboard-subtitle">
            Manage your inbox with the power of AI.
          </p>
        </div>

        <button className="connect-gmail" disabled>
          <Mail size={17} />
          Gmail Integration Coming Soon
        </button>
      </div>

      <div className="email-toolbar">
        <div className="email-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="refresh-button"
          onClick={() => {
            setSearch("");
            setLoading(true);
            fetchEmails();
          }}
        >
          <RefreshCw size={17} />
          Reset
        </button>
      </div>

      <div className="email-workspace">
        <aside className="email-sidebar">
          <button
            className={
              activeFolder === "inbox" ? "email-folder active" : "email-folder"
            }
            onClick={() => {
              if (activeFolder !== "inbox") {
                setActiveFolder("inbox");
                setLoading(true);
                setShowAI(false);
                setShowReply(false);
                setGeneratedReply("");
              }
            }}
          >
            <Inbox size={18} />
            Inbox
          </button>

          <button
            className={
              activeFolder === "sent" ? "email-folder active" : "email-folder"
            }
            onClick={() => {
              if (activeFolder !== "sent") {
                setActiveFolder("sent");
                setLoading(true);
                setShowAI(false);
                setShowReply(false);
                setGeneratedReply("");
              }
            }}
          >
            <Send size={18} />
            Sent
          </button>

          <button className="email-folder">
            <Star size={18} />
            Starred
          </button>

          <button className="email-folder">
            <Archive size={18} />
            Archived
          </button>

          <button className="email-folder">
            <Trash2 size={18} />
            Trash
          </button>

          <div className="ai-email-card">
            <Sparkles size={22} />
            <h3>AI Email Assistant</h3>
            <p>Let AI summarize and help you reply to emails.</p>
          </div>
        </aside>

        <section className="email-list-panel">
          <div className="email-list-heading">
            <h3>Inbox</h3>
            <span>{filteredEmails.length} emails</span>
          </div>

          <div className="email-categories">
            {categories.map((category) => (
              <button
                key={category}
                className={
                  activeCategory === category ? "category active" : "category"
                }
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="empty-emails">Loading your Gmail messages...</p>
          ) : error ? (
            <p className="empty-emails">{error}</p>
          ) : filteredEmails.length > 0 ? (
            filteredEmails.map((email) => (
              <button
                key={email.id}
                className={
                  selectedEmail?.id === email.id
                    ? "email-item selected"
                    : "email-item"
                }
                onClick={() => {
                  setSelectedEmail(email);
                  setShowAI(false);
                  setAiSummary("");
                  setSummaryError("");

                  setShowReply(false);
                  setReplyInstruction("");
                  setGeneratedReply("");
                  setReplyError("");
                }}
              >
                <div className="email-avatar">{email.sender.charAt(0)}</div>

                <div className="email-item-content">
                  <div className="email-item-top">
                    <strong>{email.sender}</strong>
                    <span>{email.time}</span>
                  </div>

                  <p>{email.subject}</p>
                  <span className="email-preview">{email.preview}</span>
                </div>

                {email.unread && <span className="unread-dot" />}
              </button>
            ))
          ) : (
            <p className="empty-emails">No emails found.</p>
          )}
        </section>

        <section className="email-detail-panel">
          {selectedEmail ? (
            <>
              <div className="email-detail-header">
                <div>
                  <h2>{selectedEmail.subject}</h2>
                  <p>{selectedEmail.sender}</p>
                  <span>{selectedEmail.email}</span>
                </div>

                <button className="icon-button">
                  <Star size={19} />
                </button>
              </div>

              <div className="email-message">
                <div className="email-sender-avatar">
                  {selectedEmail.sender.charAt(0)}
                </div>

                <div>
                  <strong>{selectedEmail.sender}</strong>
                  <p className="message-time">{selectedEmail.time}</p>
                </div>
              </div>

              <div
                className="email-body"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {selectedEmail.body ||
                  selectedEmail.preview ||
                  "No email content available."}
              </div>

              <div className="email-ai-actions">
                <button
                  className="ai-summary-button"
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                >
                  <Sparkles size={17} />
                  {summaryLoading
                    ? "Generating Summary..."
                    : showAI
                      ? "Hide AI Summary"
                      : "AI Summary"}
                </button>

                <button
                  className="reply-button"
                  onClick={() => {
                    setShowReply(!showReply);
                    setReplyError("");
                  }}
                >
                  <Send size={16} />
                  {showReply ? "Close AI Reply" : "AI Reply"}
                </button>
              </div>

              {showReply && (
                <div
                  className="ai-summary-result"
                  style={{ marginTop: "16px", display: "block" }}
                >
                  <div>
                    <strong>AI Email Reply</strong>

                    <p style={{ marginTop: "12px" }}>Reply Instruction</p>

                    <textarea
                      value={replyInstruction}
                      onChange={(e) => setReplyInstruction(e.target.value)}
                      placeholder="Example: Thank them for the information and confirm my attendance."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        resize: "vertical",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />

                    <p style={{ marginTop: "12px" }}>Reply Tone</p>

                    <select
                      value={replyTone}
                      onChange={(e) => setReplyTone(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Formal">Formal</option>
                      <option value="Casual">Casual</option>
                    </select>

                    <button
                      className="ai-summary-button"
                      onClick={handleGenerateReply}
                      disabled={replyLoading}
                      style={{ marginTop: "14px" }}
                    >
                      <Sparkles size={16} />
                      {replyLoading
                        ? "Generating Reply..."
                        : "Generate AI Reply"}
                    </button>

                    {replyError && (
                      <p style={{ color: "red", marginTop: "12px" }}>
                        {replyError}
                      </p>
                    )}

                    {generatedReply && (
                      <div style={{ marginTop: "16px" }}>
                        <strong>Generated Reply</strong>

                        <textarea
                          value={generatedReply}
                          onChange={(e) => {
                            setGeneratedReply(e.target.value);
                            setSendSuccess("");
                            setSendError("");
                          }}
                          rows={8}
                          style={{
                            width: "100%",
                            padding: "12px",
                            marginTop: "10px",
                            borderRadius: "8px",
                            resize: "vertical",
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                          }}
                        />

                        <button
                          className="reply-button"
                          onClick={handleSendReply}
                          disabled={sendLoading || !generatedReply.trim()}
                          style={{ marginTop: "14px" }}
                        >
                          <Send size={16} />
                          {sendLoading ? "Sending Reply..." : "Send Reply"}
                        </button>

                        {sendError && (
                          <p style={{ color: "red", marginTop: "12px" }}>
                            {sendError}
                          </p>
                        )}

                        {sendSuccess && (
                          <p style={{ color: "green", marginTop: "12px" }}>
                            {sendSuccess}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showAI && (
                <div className="ai-summary-result">
                  <Sparkles size={18} />

                  <div>
                    <strong>AI Email Summary</strong>

                    {summaryLoading ? (
                      <p>AI is analyzing your email. Please wait...</p>
                    ) : summaryError ? (
                      <p>{summaryError}</p>
                    ) : (
                      <p style={{ whiteSpace: "pre-wrap" }}>{aiSummary}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-emails">
              Select an email to view its details.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default EmailAssistant;
