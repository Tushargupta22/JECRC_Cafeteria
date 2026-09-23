import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useStudent } from '../../context/StudentContext';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const location = useLocation();
  const { itemCount, setIsCartDrawerOpen } = useCart();
  const { student, isAuthenticated, openAuthModal, logout } = useStudent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Menu', path: '/menu' },
    { label: 'Rewards & Plus', path: '/rewards-plus' },
    { label: 'Live Leaderboard', path: '/live-leaderboard' },
    { label: 'Track Order', path: '/track-order' }
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Top Quick Navigation & Status Bar */}
      <div className="w-full bg-surface-container-low py-space-2xs px-gutter-desktop">
        <div className="max-w-container-max mx-auto flex items-center justify-between font-label-sm text-label-sm">
          <div className="flex items-center gap-space-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="font-label-md text-label-md text-on-surface">🏛️ JECRC Campus Central Dining</span>
            <span className="text-outline hidden sm:inline">•</span>
            <span className="text-secondary font-label-sm text-label-sm hidden sm:inline">Open</span>
            <span className="text-outline hidden sm:inline">•</span>
            <span className="text-primary font-label-sm text-label-sm font-bold hidden sm:inline">Active Counters</span>
          </div>
          <div className="flex items-center gap-space-xs sm:gap-space-sm">
            <Link
              to="/"
              className={`px-space-xs py-space-2xs rounded-full transition-colors font-label-sm text-label-sm ${
                !location.pathname.startsWith('/admin') && location.pathname !== '/cafeteria-display'
                  ? 'bg-surface-container-highest text-on-surface font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              Student Portal
            </Link>
            <Link
              to="/admin"
              className={`px-space-xs py-space-2xs rounded-full transition-colors font-label-sm text-label-sm ${
                location.pathname.startsWith('/admin')
                  ? 'bg-surface-container-highest text-on-surface font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              Admin Portal
            </Link>
            <Link
              to="/cafeteria-display"
              className={`px-space-xs py-space-2xs rounded-full transition-colors font-label-sm text-label-sm ${
                location.pathname === '/cafeteria-display'
                  ? 'bg-surface-container-highest text-on-surface font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              Cafeteria TV
            </Link>
          </div>
        </div>
      </div>

      {/* Main Nav Strip */}
      <div className="h-20 max-w-container-max mx-auto px-gutter-desktop flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg">
          <Link to="/" className="flex items-center gap-space-xs group">
            <img
              src="/src/assets/logo.svg"
              alt="JECRC Cafeteria Brand Logo"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-space-xs">
            {navLinks.map(link => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-space-sm py-space-xs rounded-full transition-all font-label-lg text-label-lg ${
                    active
                      ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Tools & Profile */}
        <div className="flex items-center gap-space-sm">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all shadow-[0_1px_8px_rgba(0,0,0,0.04)] font-body-sm text-body-sm"
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>Search dishes, stalls...</span>
            <kbd className="px-space-2xs py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm">⌘K</kbd>
          </button>

          {/* Cart Bag Trigger */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="relative p-space-xs rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
            title="Open Tray"
          >
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[1.25rem] text-center rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-sm font-bold">
                {itemCount}
              </span>
            )}
          </button>

          {/* Student Profile Capsule & Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-space-2xs">
              <Link
                to="/rewards-plus"
                className="flex items-center gap-space-xs pl-space-xs pr-space-sm py-space-2xs rounded-full bg-surface-container-low hover:bg-surface-container transition-all shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                title="View Profile & Rewards"
              >
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="w-8 h-8 rounded-full object-cover shadow-sm"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-space-2xs">
                    <span className="font-label-md text-label-md text-on-surface">{student.shortName}</span>
                    {student.isPlusMember && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                        ⭐ Plus
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-space-2xs text-on-surface-variant font-label-sm text-label-sm">
                    <span>🪙 {student.points} pts</span>
                    <span>•</span>
                    <span className="text-primary font-bold">
                      {student.dailyRank > 0 ? `Rank #${student.dailyRank}` : 'Unranked'}
                    </span>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="flex items-center gap-space-xs px-space-md py-space-2xs rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">account_circle</span>
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-full text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-surface-container-lowest border-t border-surface-container px-gutter-mobile py-space-md flex flex-col gap-space-xs shadow-xl animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenSearch) onOpenSearch();
            }}
            className="flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-surface-container-low text-on-surface-variant mb-space-xs"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            <span>Search dishes, stalls...</span>
          </button>
          {navLinks.map(link => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-space-md py-space-sm rounded-xl font-label-lg text-label-lg transition-colors flex items-center justify-between ${
                  active
                    ? 'bg-primary-container text-on-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{link.label}</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
