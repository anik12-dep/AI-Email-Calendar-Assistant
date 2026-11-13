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
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.data.response,
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
