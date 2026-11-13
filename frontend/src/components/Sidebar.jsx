import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Mail,
  CalendarDays,
  Settings,
  Bot,
  Sparkles,
} from "lucide-react";

function Sidebar() {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Email Assistant",
      path: "/email",
      icon: Mail,
    },
    {
      name: "Calendar",
      path: "/calendar",
      icon: CalendarDays,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
    {
      name: "Ollama AI",
      path: "/ollama",
      icon: Bot,
    },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Bot size={25} />
        </div>

        <div>
          <h2>AssistAI</h2>
          <span>Personal AI Workspace</span>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="section-label">WORKSPACE</p>

        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive ? "menu-link active" : "menu-link"
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="ai-status">
          <Sparkles size={19} />
          <div>
            <strong>AI Assistant</strong>
            <span>Workspace ready</span>
          </div>
        </div>

        <p className="sidebar-footer">Powered by Local AI</p>
      </div>
    </aside>
  );
}

export default Sidebar;
