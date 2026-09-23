import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentLayout } from '../layouts/StudentLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { Home } from '../pages/Home';
import { Menu } from '../pages/Menu';
import { TrackOrder } from '../pages/TrackOrder';
import { RewardsPlus } from '../pages/RewardsPlus';
import { Leaderboard } from '../pages/Leaderboard';
import { AdminDashboard } from '../pages/AdminDashboard';
import { AdminInventory } from '../pages/AdminInventory';
import { AdminKiosks } from '../pages/AdminKiosks';
import { CafeteriaDisplay } from '../pages/CafeteriaDisplay';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Student & Public Routes */}
      <Route path="/" element={<StudentLayout />}>
        <Route index element={<Home />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="menu" element={<Menu />} />
        <Route path="track-order" element={<TrackOrder />} />
        <Route path="rewards-plus" element={<RewardsPlus />} />
        <Route path="profile" element={<RewardsPlus />} />
        <Route path="live-leaderboard" element={<Leaderboard />} />
      </Route>

      {/* Admin Operations Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="kiosks" element={<AdminKiosks />} />
      </Route>

      {/* Standalone 10-foot Cafeteria TV Broadcast Display */}
      <Route path="/cafeteria-display" element={<CafeteriaDisplay />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
