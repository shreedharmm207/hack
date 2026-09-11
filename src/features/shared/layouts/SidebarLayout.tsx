import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { logout } from '../../auth/authSlice';
import { markAllAsRead } from '../notificationsSlice';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface SidebarLayoutProps {
  navItems: NavItem[];
  portalName: string;
  portalColor: string;
  logoIcon: string;
  children: React.ReactNode;
}

export default function SidebarLayout({
  navItems, portalName, portalColor, logoIcon, children
}: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(s => s.auth);
  const { items: notifications, unreadCount } = useAppSelector(s => s.notifications);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-200 z-30`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center px-4 border-b border-border ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
          <div className={`w-9 h-9 rounded-lg ${portalColor} flex items-center justify-center text-white text-lg flex-shrink-0`}>
            {logoIcon}
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-sm font-bold text-text-primary leading-tight">FarmGrid</div>
              <div className="text-xs text-text-muted">{portalName}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-item-active flex' : 'nav-item-default flex'
              }
            >
              <span className="text-base">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border p-2">
          <button
            onClick={handleLogout}
            className={`nav-item-default w-full ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
          >
            <span>🚪</span>
            {sidebarOpen && <span className="text-sm">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="btn-ghost p-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="btn-ghost p-2 relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-2xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 card shadow-elevated z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button
                      className="text-xs text-primary-700 hover:underline"
                      onClick={() => { dispatch(markAllAsRead()); }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-text-muted">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 ${(!n.is_read && !n.isRead) ? 'bg-teal-50/40' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{n.title}</div>
                            <div className="text-xs text-text-muted mt-0.5">{n.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
              <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-text-primary">{user?.email?.split('@')[0]}</div>
                <div className="text-2xs text-text-muted capitalize">{user?.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
