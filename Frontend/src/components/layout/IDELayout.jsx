import { useState, useEffect } from "react";
import { Box, Group, ActionIcon, Tooltip, Text, Avatar, Menu, Transition } from "@mantine/core";
import {
  IconCode,
  IconHistory,
  IconUser,
  IconLogout,
  IconMoon,
  IconSun,
  IconSettings,
  IconSparkles,
  IconGitCommit,
  IconFolder,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import ProjectSearchBar from "../projects/ProjectSearchBar";
import ProjectReviewPanel from "../projects/ProjectReviewPanel";
import "./IDELayout.css";

const IDELayout = ({ children, activeView, onViewChange }) => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Set initial theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute("data-theme", darkMode ? "light" : "dark");
  };

  const sidebarItems = [
    { icon: IconCode, label: "Code Review", value: "review", color: "#60A5FA" },
    { icon: IconGitCommit, label: "Pre-Commit", value: "precommit", color: "#22c55e" },
    { icon: IconHistory, label: "History", value: "history", color: "#A78BFA" },
    { icon: IconFolder, label: "My Projects", value: "projects", color: "#F59E0B" },
  ];

  return (
    <div className={`ide-layout ${darkMode ? "dark" : "light"}`}>
      {/* Sidebar stângă - Navigation */}
      <div className="ide-sidebar">
        <div className="sidebar-content">
          {/* Logo/Brand */}
          <div className="sidebar-brand">
            <IconSparkles size={28} className="brand-icon" />
          </div>

          {/* Navigation Items */}
          <div className="sidebar-items">
            {sidebarItems.map((item) => (
              <Tooltip
                key={item.value}
                label={item.label}
                position="right"
                transitionProps={{ transition: "pop", duration: 200 }}
              >
                <div
                  className={`sidebar-item ${activeView === item.value ? "active" : ""}`}
                  onClick={() => onViewChange(item.value)}
                  style={{
                    "--item-color": item.color,
                  }}
                >
                  <item.icon size={24} />
                  <div className="item-indicator" />
                </div>
              </Tooltip>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="sidebar-bottom">
            <Tooltip label={darkMode ? "Light Mode" : "Dark Mode"} position="right">
              <div className="sidebar-item" onClick={toggleTheme}>
                {darkMode ? <IconSun size={22} /> : <IconMoon size={22} />}
              </div>
            </Tooltip>

            <Menu position="right-end" transitionProps={{ transition: "pop" }}>
              <Menu.Target>
                <div className="sidebar-item user-avatar">
                  <Avatar size={32} radius="xl" color="blue">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </Avatar>
                </div>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="sm" weight={500}>
                    {user?.email}
                  </Text>
                </Menu.Label>
                <Menu.Item icon={<IconUser size={14} />}>Profil</Menu.Item>
                <Menu.Item icon={<IconSettings size={14} />}>Setări</Menu.Item>
                <Menu.Divider />
                <Menu.Item icon={<IconLogout size={14} />} color="red" onClick={logout}>
                  Deconectare
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ide-main">
        {/* Header cu SearchBar */}
        <div className="ide-header">
          <ProjectSearchBar onProjectSelected={setSelectedProject} />
        </div>
        
        {/* Content Area */}
        <div className="ide-content">
          {selectedProject ? (
            <ProjectReviewPanel 
              project={selectedProject} 
              onClose={() => setSelectedProject(null)} 
            />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
};

export default IDELayout;

