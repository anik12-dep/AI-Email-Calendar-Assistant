import { Outlet } from "react-router-dom";
import { useContext } from "react";
import Sidebar from "./Sidebar";
import { ThemeContext } from "../ThemeContext";

function Layout() {
  const { darkMode } = useContext(ThemeContext);

  return (
    <div className={`app-layout ${darkMode ? "dark-mode" : ""}`}>
      <Sidebar />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
