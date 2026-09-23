import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] py-space-2xl mt-space-3xl border-t border-surface-container/60">
      <div className="max-w-container-max mx-auto px-gutter-desktop flex flex-col md:flex-row justify-between items-center gap-space-lg">
        <div className="flex items-center gap-space-xs">
          <img
            src="/src/assets/logo.svg"
            alt="JECRC Cafeteria Brand Logo"
            className="h-7 w-auto object-contain"
          />
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
          © 2026 JECRC Cafeteria. Smart Campus Dining Technologies. Serving speed &amp; freshness.
        </p>
        <div className="flex items-center gap-space-md font-label-md text-label-md text-on-surface-variant">
          <Link to="/menu" className="hover:text-primary transition-colors">
            Dietary Guide
          </Link>
          <Link to="/cafeteria-display" className="hover:text-primary transition-colors">
            Kiosk Status
          </Link>
          <Link to="/rewards-plus" className="hover:text-primary transition-colors">
            Campus Support
          </Link>
        </div>
      </div>
    </footer>
  );
};
