import { useEffect, useRef, useState } from "react";
import API from "../api";
import "./OllamaAI.css";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

import {
  Bot,
  Send,
  Trash2,
  LoaderCircle,
  User,
  Sparkles,
  Cpu,
  Wifi,
  WifiOff,
  Copy,
  Check,
} from "lucide-react";

const extractText = (node) => {
  if (typeof node === "string") return node;

  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }

  if (node && typeof node === "object") {
    if (node.type === "text") {
      return node.value || "";
    }

    if (node.children) {
      return node.children.map(extractText).join("");
    }

    if (node.props?.children) {
      return extractText(node.props.children);
    }
  }

  return "";
};

function OllamaAI() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("llama3.2");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [sendingInvitationIndex, setSendingInvitationIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const [copiedCode, setCopiedCode] = useState("");

  const suggestions = [
    {
      icon: "💡",
      title: "Explain something",
      prompt: "Explain Artificial Intelligence in simple words.",
    },
    {
      icon: "💻",
      title: "Help with coding",
      prompt: "Teach me Python programming with a simple example.",
    },
    {
      icon: "🧠",
      title: "Learn something",
      prompt:
        "What are the differences between Machine Learning and Deep Learning?",
    },
    {
      icon: "✍️",
      title: "Write something",
      prompt: "Help me write a professional email.",
    },
  ];

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await API.get("/models");

        setModels(response.data.available_models || []);

        if (response.data.selected_model) {
          setSelectedModel(response.data.selected_model);
        }

        setConnected(true);
        setError("");
      } catch {
        setConnected(false);
        setError("Could not connect to Ollama backend.");
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async (customMessage) => {
    const message = (customMessage || input).trim();

    if (!message || loading || !connected) return;

    const history = messages
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await API.post("/chat", {
        message,
        history,
      });

      console.log("CHAT API RESPONSE:", response.data);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.data.response,
          intent: response.data.intent,
          invitation: response.data.invitation,
          email: response.data.email,
          missing_fields: response.data.missing_fields,
          ready_for_confirmation: response.data.ready_for_confirmation,
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Something went wrong. Please check Ollama and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmInvitation = async (message, index) => {
    if (
      !message.invitation ||
      message.ready_for_confirmation !== true ||
      message.invitation_status ||
      sendingInvitationIndex !== null
    ) {
      return;
    }

    setSendingInvitationIndex(index);
    setError("");

    try {
      const response = await API.post(
        "/calendar/send-public-invitation",
        message.invitation
      );

      setMessages((previous) =>
        previous.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                invitation_status: "sent",
                event_link: response.data.event_link || "",
              }
            : item
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not send the calendar invitation. Please try again."
      );
    } finally {
      setSendingInvitationIndex(null);
    }
  };

  const confirmEmail = async (message, index) => {
    if (
      !message.email ||
      message.ready_for_confirmation !== true ||
      message.email_status ||
      sendingInvitationIndex !== null
    ) {
      return;
    }

    setSendingInvitationIndex(index);
    setError("");

    try {
      const response = await API.post("/email/send", {
        recipient_email: message.email.recipient_email,
        subject: message.email.subject,
        body: message.email.body,
      });

      setMessages((previous) =>
        previous.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                email_status: "sent",
                email_sender: response.data.sender_email || "",
              }
            : item
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not send the email. Please try again."
      );
    } finally {
      setSendingInvitationIndex(null);
    }
  };

  const cancelEmail = (index) => {
    setMessages((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, email_status: "cancelled" }
          : item
      )
    );
  };

  const cancelInvitation = (index) => {
    setMessages((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, invitation_status: "cancelled" }
          : item
      )
    );
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    setInput("");
  };

  const handleModelChange = async (event) => {
    const model = event.target.value;

    try {
      await API.post("/settings/model", { model });

      setSelectedModel(model);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not change the selected model.",
      );
    }
  };
  const copyCode = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);

      setTimeout(() => {
        setCopiedCode("");
      }, 2000);
    } catch {
      setError("Could not copy code.");
    }
  };
  return (
    <div className="ollama-page">
      {/* Header */}

      <div className="ollama-header">
        <div className="ollama-title-section">
          <div className="ollama-title-icon">
            <Bot size={25} />
          </div>

          <div>
            <h1>Ollama AI</h1>
            <p>Your personal AI assistant, powered locally.</p>
          </div>
        </div>

        <div className="ollama-header-actions">
          <div className="ollama-connection-status">
            {connected ? (
              <>
                <Wifi size={15} />
                <span>Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={15} />
                <span>Disconnected</span>
              </>
            )}
          </div>

          <div className="ollama-model-selector">
            <Cpu size={17} />

            <select
              value={selectedModel}
              onChange={handleModelChange}
              disabled={!connected || loading || models.length === 0}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <button
            className="ollama-clear-button"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            <Trash2 size={17} />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Chat Container */}

      <div className="ollama-chat-container">
        <div className="ollama-messages">
          {messages.length === 0 ? (
            <div className="ollama-empty-state">
              <div className="ollama-empty-icon">
                <Sparkles size={34} />
              </div>

              <span className="ollama-welcome-label">
                YOUR LOCAL AI ASSISTANT
              </span>

              <h2>What can I help you with?</h2>

              <p>
                Ask questions, explore ideas, write code, or learn something new
                with your local AI.
              </p>

              <div className="ollama-suggestions">
                {suggestions.map((item) => (
                  <button
                    className="ollama-suggestion"
                    key={item.title}
                    onClick={() => setInput(item.prompt)}
                  >
                    <span className="suggestion-icon">{item.icon}</span>

                    <strong>{item.title}</strong>

                    <span>{item.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div className={`ollama-message ${message.role}`} key={index}>
                <div className="ollama-message-icon">
                  {message.role === "user" ? (
                    <User size={19} />
                  ) : (
                    <Bot size={19} />
                  )}
                </div>

                <div className="ollama-message-content">
                  <strong>{message.role === "user" ? "You" : "Ollama"}</strong>

                  <div className="ollama-markdown">
                    <ReactMarkdown
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        pre({ children, ...props }) {
                          const codeElement = children?.props;
                          const code = extractText(children).replace(/\n$/, "");
                          const language =
                            codeElement?.className
                              ?.replace("hljs", "")
                              .replace("language-", "")
                              .trim() || "code";

                          const codeId = `${index}-code`;

                          return (
                            <div className="ollama-code-block">
                              <div className="ollama-code-header">
                                <span>{language}</span>

                                <button
                                  onClick={() => copyCode(code, codeId)}
                                  className="ollama-copy-button"
                                  type="button"
                                >
                                  {copiedCode === codeId ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                  {copiedCode === codeId ? "Copied" : "Copy"}
                                </button>
                              </div>

                              <pre {...props}>{children}</pre>
                            </div>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.intent === "calendar_invitation" &&
                    message.invitation && (
                      <div className="ollama-invitation-card">
                        <div className="ollama-invitation-heading">
                          <strong>📅 Calendar Invitation Preview</strong>
                        </div>

                        {message.invitation_status === "sent" ? (
                          <div className="ollama-invitation-success">
                            Invitation sent successfully!
                            {message.event_link && (
                              <a
                                href={message.event_link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open Google Calendar Event
                              </a>
                            )}
                          </div>
                        ) : message.invitation_status === "cancelled" ? (
                          <p className="ollama-invitation-cancelled">
                            Invitation cancelled. Nothing was sent.
                          </p>
                        ) : message.ready_for_confirmation === true ? (
                          <>
                            <div className="ollama-invitation-details">
                              <p><strong>Title:</strong> {message.invitation.title}</p>
                              <p><strong>Recipient:</strong> {message.invitation.recipient_email}</p>
                              <p>
                                <strong>Start:</strong>{" "}
                                {new Date(message.invitation.start_time).toLocaleString(
                                  "en-BD",
                                  { timeZone: "Asia/Dhaka" }
                                )}
                              </p>
                              <p>
                                <strong>End:</strong>{" "}
                                {new Date(message.invitation.end_time).toLocaleString(
                                  "en-BD",
                                  { timeZone: "Asia/Dhaka" }
                                )}
                              </p>
                              {message.invitation.location && (
                                <p><strong>Location:</strong> {message.invitation.location}</p>
                              )}
                              {message.invitation.description && (
                                <p><strong>Description:</strong> {message.invitation.description}</p>
                              )}
                            </div>

                            <div className="ollama-invitation-actions">
                              <button
                                type="button"
                                className="ollama-invitation-confirm"
                                onClick={() => confirmInvitation(message, index)}
                                disabled={sendingInvitationIndex !== null}
                              >
                                {sendingInvitationIndex === index
                                  ? "Sending..."
                                  : "Confirm & Send"}
                              </button>

                              <button
                                type="button"
                                className="ollama-invitation-cancel"
                                onClick={() => cancelInvitation(index)}
                                disabled={sendingInvitationIndex !== null}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <p>Please provide the missing meeting details in the chat.</p>
                        )}
                      </div>
                    )}
                  {message.role === "assistant" && (
                    <pre style={{ fontSize: "12px", color: "#16a34a", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify({
                        intent: message.intent,
                        email: message.email,
                        ready_for_confirmation: message.ready_for_confirmation
                      }, null, 2)}
                    </pre>
                  )}

                  {message.intent === "email_draft" && message.email && (
                    <div className="ollama-invitation-card ollama-email-card">
                      <div className="ollama-invitation-heading">
                        <strong>✉️ Email Preview</strong>
                      </div>

                      {message.email_status === "sent" ? (
                        <div className="ollama-invitation-success">
                          Email sent successfully!
                          {message.email_sender && (
                            <span>Sent from: {message.email_sender}</span>
                          )}
                        </div>
                      ) : message.email_status === "cancelled" ? (
                        <p className="ollama-invitation-cancelled">
                          Email cancelled. Nothing was sent.
                        </p>
                      ) : message.ready_for_confirmation === true ? (
                        <>
                          <div className="ollama-invitation-details">
                            <p>
                              <strong>To:</strong>{" "}
                              {message.email.recipient_email}
                            </p>
                            <p>
                              <strong>Subject:</strong>{" "}
                              {message.email.subject}
                            </p>
                            <p>
                              <strong>Message:</strong>
                            </p>
                            <div className="ollama-email-body">
                              {message.email.body}
                            </div>
                          </div>

                          <div className="ollama-invitation-actions">
                            <button
                              type="button"
                              className="ollama-invitation-confirm"
                              onClick={() => confirmEmail(message, index)}
                              disabled={sendingInvitationIndex !== null}
                            >
                              {sendingInvitationIndex === index
                                ? "Sending..."
                                : "Confirm & Send"}
                            </button>

                            <button
                              type="button"
                              className="ollama-invitation-cancel"
                              onClick={() => cancelEmail(index)}
                              disabled={sendingInvitationIndex !== null}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <p>Please provide the missing email details in the chat.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="ollama-loading">
              <LoaderCircle size={19} className="ollama-spinner" />
              <span>Ollama is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && <p className="ollama-error">{error}</p>}

        {/* Input */}

        <div className="ollama-input-area">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your local AI..."
            rows={2}
            disabled={!connected || loading}
          />

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || !connected}
            aria-label="Send message"
          >
            <Send size={19} />
          </button>
        </div>

        <p className="ollama-disclaimer">
          <Sparkles size={12} />
          Powered by Ollama · Your AI runs locally
        </p>
      </div>
    </div>
  );
}

export default OllamaAI;
