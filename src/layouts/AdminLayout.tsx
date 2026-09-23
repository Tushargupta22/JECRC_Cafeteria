import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin, isAuthenticated, isLoading, openAuthModal, logout } = useStudent();

  const adminLinks = [
    { label: 'Kitchen Live Board', path: '/admin', icon: 'dashboard' },
    { label: 'Stock & Stations', path: '/admin/inventory', icon: 'inventory_2' },
    { label: 'Station Kiosks', path: '/admin/kiosks', icon: 'settings' }
  ];

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Access control: Protected Admin Route
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container/80 p-8 rounded-3xl shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>

          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">
            JECRC Cafeteria
          </h2>
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
            Admin Portal Access
          </div>

          {isAuthenticated ? (
            <>
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error font-body-sm text-body-sm mb-5 text-left w-full flex items-start gap-2">
                <span className="material-symbols-outlined text-base mt-0.5 shrink-0">lock</span>
                <span>
                  <strong>Unauthorized Access:</strong> Your current account (<strong>{user?.email}</strong>) has student privileges. Admin operations require authorized staff credentials.
                </span>
              </div>

              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    openAuthModal('login', 'admin');
                  }}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">login</span>
                  <span>Sign In as Authorized Admin</span>
                </button>

                <Link
                  to="/"
                  className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Return to Student Portal</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
                Cafeteria operations, kitchen management, and inventory controls are restricted to authenticated cafeteria staff and managers.
              </p>

              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'admin')}
                  className="w-full py-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                  <span>Admin Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal('register', 'admin')}
                  className="w-full py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>Register as New Staff / Admin</span>
                </button>

                <Link
                  to="/"
                  className="w-full py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Return to Student Portal</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard Layout
  return (
    <div className="min-h-screen bg-surface text-on-surface flex">
      {/* Fixed Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col pt-space-lg pb-space-lg border-r border-surface-container/60">
        <div className="px-space-lg mb-space-lg flex items-center gap-space-xs">
          <img
            src="/src/assets/logo.svg"
            alt="JECRC Cafeteria Brand Logo"
            className="h-7 w-auto object-contain"
          />
          <span className="font-headline-sm text-headline-sm text-primary font-bold ml-1">Admin Portal</span>
        </div>

        <nav className="flex-1 px-space-sm space-y-space-2xs">
          {adminLinks.map(link => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-space-md py-space-sm rounded-xl font-label-lg text-label-lg transition-all ${
                  active
                    ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined mr-space-sm text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-space-md pt-space-md border-t border-surface-container space-y-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-space-xs w-full py-space-xs rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return to Student Portal</span>
          </Link>

          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-space-xs w-full py-space-xs rounded-xl bg-error/10 text-error hover:bg-error/20 font-label-md text-label-md transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Viewport */}
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top operational manager header */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg border-b border-surface-container/60">
          <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span>JECRC Central Kitchen Hub - Live Active</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
              Admin: {user?.name || 'Authorized Manager'}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center text-xs shadow-sm uppercase">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-full hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </header>

        <main className="w-full pt-16 flex-1 px-space-lg pb-space-2xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
