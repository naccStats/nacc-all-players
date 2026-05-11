import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="main-area">
        <Header onMenuClick={openSidebar} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
