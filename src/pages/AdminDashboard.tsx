import React, { useState, useEffect } from 'react';
import { useAdminKitchen } from '../context/AdminKitchenContext';
import { analyticsApi, AdminAnalytics } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const {
    tickets,
    menuItems,
    isChimeActive,
    isOnlineOrdersPaused,
    acceptOrder,
    markOrderReady,
    completeHandover,
    toggleItemStatus,
    updateItemStock,
    editItemPrice,
    toggleEmergencyPause,
    toggleChime
  } = useAdminKitchen();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    analyticsApi.getAdminAnalytics().then(res => {
      if (res && res.analytics) {
        setAnalytics(res.analytics);
      }
    }).catch(() => {});
  }, [tickets]);

  const [selectedStationFilter, setSelectedStationFilter] = useState<'all' | 'grill' | 'beverage'>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');
  const [editingStockItemId, setEditingStockItemId] = useState<string | null>(null);
  const [stockInputValue, setStockInputValue] = useState<string>('');

  const filteredTickets = tickets.filter(t => {
    if (selectedStationFilter === 'grill') return t.station.includes('Grill') || t.station.includes('Station 2');
    if (selectedStationFilter === 'beverage') return t.items.some(i => i.stationTag.includes('Beverage'));
    return true;
  });

  const newOrders = filteredTickets.filter(t => t.status === 'new');
  const preparingOrders = filteredTickets.filter(t => t.status === 'preparing');
  const readyOrders = filteredTickets.filter(t => t.status === 'ready');

  const handleEditPriceSubmit = (itemId: string) => {
    const parsed = parseInt(newPriceValue);
    if (!isNaN(parsed) && parsed > 0) {
      editItemPrice(itemId, parsed);
    }
    setEditingItemId(null);
    setNewPriceValue('');
  };

  const handleEditStockSubmit = (itemId: string) => {
    const parsed = parseInt(stockInputValue, 10);
    if (!isNaN(parsed)) {
      updateItemStock(itemId, Math.max(0, parsed));
    }
    setEditingStockItemId(null);
    setStockInputValue('');
  };

  return (
    <div className="flex flex-col w-full pb-space-2xl space-y-space-lg">
      {/* Operational Header & Realtime Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-space-2xs">
            <span className="font-label-sm text-label-sm tracking-wider uppercase px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed-variant flex items-center gap-1 font-bold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Live Socket Feed • Connected
            </span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">
              Shift #02 (11:30 - 15:30)
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            Kitchen Command &amp; Flow Engine
          </h1>
        </div>

        {/* Quick Action / Toggles */}
        <div className="flex items-center flex-wrap gap-space-xs">
          <button
            onClick={toggleChime}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest text-on-surface shadow-sm hover:shadow-md transition-all font-label-md text-label-md font-bold cursor-pointer border border-surface-container"
          >
            <span className={`material-symbols-outlined text-lg ${isChimeActive ? 'text-secondary' : 'text-outline'}`}>
              {isChimeActive ? 'volume_up' : 'volume_off'}
            </span>
            <span>{isChimeActive ? 'Kitchen Chime Active' : 'Chime Muted'}</span>
          </button>

          <div className="flex items-center bg-surface-container-lowest px-space-sm py-space-xs rounded-full shadow-sm text-on-surface font-label-md text-label-md gap-2 border border-surface-container">
            <span className="material-symbols-outlined text-primary text-base">timer</span>
            <span>
              Peak Service Rush: <strong className="text-primary font-bold">High (82% Cap)</strong>
            </span>
          </div>

          <button
            onClick={toggleEmergencyPause}
            className={`flex items-center gap-1 px-space-md py-space-xs rounded-full font-label-md text-label-md font-bold transition-colors cursor-pointer ${
              isOnlineOrdersPaused
                ? 'bg-error text-on-error shadow-md'
                : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isOnlineOrdersPaused ? 'play_circle' : 'pause_circle'}
            </span>
            <span>{isOnlineOrdersPaused ? 'Resume Online Orders' : 'Pause Online Orders'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Metrics Shelf (Bento Strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
        {/* Metric 1: Revenue */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Today's Gross
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-low text-primary">
              <span className="material-symbols-outlined text-lg">currency_rupee</span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="font-headline-md text-headline-md text-on-surface font-black tracking-tight">
              ₹{analytics?.totalRevenue ?? 1880}
            </div>
            <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm mt-0.5 font-bold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>Avg Order: ₹{Math.round(analytics?.averageOrderValue ?? 188)}</span>
            </div>
          </div>
          <div className="w-full h-8 pt-1">
            <svg className="w-full h-full text-secondary" fill="none" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path d="M0,20 Q20,18 35,12 T70,9 T100,2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
            </svg>
          </div>
        </div>

        {/* Metric 2: Completed Orders */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Completed Orders
            </span>
            <span className="p-1.5 rounded-lg bg-secondary-container text-on-secondary-fixed-variant">
              <span className="material-symbols-outlined text-lg">done_all</span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="font-headline-md text-headline-md text-on-surface font-black tracking-tight">
              {analytics?.ordersByStatus?.Completed ?? (analytics?.totalOrders ? Math.max(1, analytics.totalOrders - tickets.filter(t => t.status !== 'completed').length) : 8)} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">trays</span>
            </div>
            <div className="text-on-surface-variant font-label-sm text-label-sm mt-0.5">
              Total {analytics?.totalOrders ?? 10} orders placed
            </div>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-secondary h-full rounded-full" style={{ width: '86%' }}></div>
          </div>
        </div>

        {/* Metric 3: Live Queue Status */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Active Queue
            </span>
            <span className="p-1.5 rounded-lg bg-primary-fixed text-on-primary-fixed-variant">
              <span className="material-symbols-outlined text-lg">skillet</span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="font-headline-md text-headline-md text-primary font-black tracking-tight">
              {tickets.filter(t => t.status !== 'completed').length}{' '}
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">tickets</span>
            </div>
            <div className="flex items-center gap-2 font-label-sm text-label-sm mt-0.5">
              <span className="text-primary font-bold">{preparingOrders.length} on grill</span>
              <span className="text-on-surface-variant">•</span>
              <span className="text-on-surface-variant">{newOrders.length} in queue</span>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
            <div className="h-1.5 flex-1 bg-primary rounded-full"></div>
            <div className="h-1.5 flex-1 bg-surface-container-high rounded-full"></div>
            <div className="h-1.5 flex-1 bg-surface-container-high rounded-full"></div>
          </div>
        </div>

        {/* Metric 4: Plus Members MRR */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Dining Club Plus
            </span>
            <span className="p-1.5 rounded-lg bg-tertiary-container text-on-tertiary-container">
              <span className="material-symbols-outlined text-lg">stars</span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="font-headline-md text-headline-md text-on-surface font-black tracking-tight">
              {analytics?.activeSubscriptions ?? 3} Members
            </div>
            <div className="text-on-surface-variant font-label-sm text-label-sm mt-0.5">
              Total {analytics?.totalUsers ?? 10} registered students
            </div>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-tertiary h-full rounded-full" style={{ width: '92%' }}></div>
          </div>
        </div>

        {/* Metric 5: Average Prep Time */}
        <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between border border-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Avg Prep Window
            </span>
            <span className="p-1.5 rounded-lg bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-lg">speed</span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="font-headline-md text-headline-md text-on-surface font-black tracking-tight">
              5.8 <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">mins</span>
            </div>
            <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm mt-0.5 font-semibold">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>Optimal throughput</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-secondary h-full rounded-full" style={{ width: '74%' }}></div>
          </div>
        </div>
      </div>

      {/* Primary Operations Workspace (2 Column Split) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Left 8 Columns: Live Kanban Order Queue */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-space-xs border border-surface-container/60">
            <div className="flex items-center gap-space-sm">
              <span className="font-title-lg text-title-lg text-on-surface font-bold">Live Kitchen Kanban</span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant font-semibold">
                Auto-sync 3s
              </span>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => setSelectedStationFilter('all')}
                className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm font-bold cursor-pointer ${
                  selectedStationFilter === 'all'
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                All Stations
              </button>
              <button
                onClick={() => setSelectedStationFilter('grill')}
                className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm font-bold cursor-pointer ${
                  selectedStationFilter === 'grill'
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Grill &amp; Fryer
              </button>
              <button
                onClick={() => setSelectedStationFilter('beverage')}
                className={`px-space-sm py-1 rounded-lg font-label-sm text-label-sm font-bold cursor-pointer ${
                  selectedStationFilter === 'beverage'
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Beverage Bar
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {/* Column 1: New Orders */}
            <div className="bg-surface-container-low p-space-sm rounded-2xl flex flex-col gap-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between pb-space-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  <span className="font-title-md text-title-md text-on-surface font-bold">New Orders</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
                  {newOrders.length}
                </span>
              </div>

              {newOrders.length === 0 ? (
                <div className="p-space-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                  No new tickets
                </div>
              ) : (
                newOrders.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-sm border-l-4 border-l-primary-container"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-black">
                          Token {ticket.tokenNumber}
                        </span>
                        <span className="px-space-xs py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold animate-pulse">
                          Pending
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-label-md text-label-md text-on-surface">
                        <span className="font-bold">{ticket.customerName}</span>
                        <span className="text-on-surface-variant font-label-sm text-label-sm">{ticket.orderNumber}</span>
                      </div>
                      <div className="text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                        App Order • {ticket.createdAt}
                      </div>
                    </div>

                    <div className="p-space-xs rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface space-y-1">
                      {ticket.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center font-bold">
                          <span>{it.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-variant font-normal">
                            {it.stationTag}
                          </span>
                        </div>
                      ))}
                      {ticket.note && (
                        <div className="font-label-sm text-label-sm text-primary italic pt-1">
                          Note: {ticket.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 font-label-md text-label-md">
                      <span className="text-on-surface-variant">
                        Paid Online: <strong className="text-on-surface">₹{ticket.totalAmount}</strong>
                      </span>
                      <span className="text-xs text-secondary font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">verified</span> {ticket.paymentMethod}
                      </span>
                    </div>

                    <button
                      onClick={() => acceptOrder(ticket.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow hover:opacity-95 transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">soup_kitchen</span>
                      <span>Accept &amp; Fire Order</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Column 2: In Cooking */}
            <div className="bg-surface-container-low p-space-sm rounded-2xl flex flex-col gap-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between pb-space-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="font-title-md text-title-md text-on-surface font-bold">In Cooking 👨‍🍳</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
                  {preparingOrders.length}
                </span>
              </div>

              {preparingOrders.length === 0 ? (
                <div className="p-space-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                  Grill stations clear
                </div>
              ) : (
                preparingOrders.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-sm border-l-4 border-l-tertiary"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-headline-sm text-headline-sm text-tertiary tracking-tight font-black">
                          Token {ticket.tokenNumber}
                        </span>
                        <span className="px-space-xs py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">microwave</span> Cooking 4m
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-label-md text-label-md text-on-surface">
                        <span className="font-bold">{ticket.customerName}</span>
                        <span className="text-on-surface-variant font-label-sm text-label-sm">{ticket.orderNumber}</span>
                      </div>
                      {ticket.isPlusPriority && (
                        <div className="text-tertiary font-label-sm text-label-sm font-bold mt-0.5">
                          Cafeteria Plus Member (Priority Lane)
                        </div>
                      )}
                    </div>

                    <div className="p-space-xs rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface space-y-1">
                      {ticket.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center font-bold">
                          <span>{it.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-normal">
                            {it.stationTag}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 font-label-md text-label-md">
                      <span className="text-on-surface-variant">
                        Paid: <strong className="text-on-surface">₹{ticket.totalAmount}</strong>
                      </span>
                      <span className="text-xs text-on-surface-variant">Chef: Alex M.</span>
                    </div>

                    <button
                      onClick={() => markOrderReady(ticket.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-tertiary text-on-tertiary font-label-md text-label-md shadow hover:opacity-95 transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">notifications_active</span>
                      <span>Mark Ready for Pickup 🔔</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Column 3: Counter Ready */}
            <div className="bg-surface-container-low p-space-sm rounded-2xl flex flex-col gap-space-sm border border-surface-container/60">
              <div className="flex items-center justify-between pb-space-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span className="font-title-md text-title-md text-on-surface font-bold">Counter Ready</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                  {readyOrders.length}
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="p-space-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                  No trays waiting
                </div>
              ) : (
                readyOrders.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-space-sm border-l-4 border-l-secondary"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-headline-sm text-headline-sm text-secondary tracking-tight font-black">
                          Token {ticket.tokenNumber}
                        </span>
                        <span className="px-space-xs py-0.5 rounded bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                          Counter #01
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-label-md text-label-md text-on-surface">
                        <span className="font-bold">{ticket.customerName}</span>
                        <span className="text-on-surface-variant font-label-sm text-label-sm">{ticket.orderNumber}</span>
                      </div>
                      <div className="text-secondary font-label-sm text-label-sm font-semibold">
                        Notified via SMS &amp; App Push
                      </div>
                    </div>

                    <div className="p-space-xs rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface space-y-1">
                      {ticket.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center font-bold">
                          <span>{it.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-container-high font-normal">
                            {it.stationTag}
                          </span>
                        </div>
                      ))}
                      {ticket.note && (
                        <div className="text-on-surface-variant font-label-sm text-label-sm">
                          {ticket.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 font-label-md text-label-md">
                      <span className="text-on-surface-variant">
                        Total: <strong className="text-on-surface">₹{ticket.totalAmount}</strong>
                      </span>
                      <span className="text-xs text-secondary font-bold">Verified Paid</span>
                    </div>

                    <button
                      onClick={() => completeHandover(ticket.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md shadow hover:opacity-95 transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>Complete Handover ✅</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Floor Status Banner */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-space-sm border border-surface-container/60">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-fixed-variant">
                <span className="material-symbols-outlined">electric_bolt</span>
              </div>
              <div>
                <div className="font-title-md text-title-md text-on-surface font-bold">Digital Kiosk Speed Mode Active</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  Express single-item checkout routing directly to Beverage Line. Average queue wait is 3m 40s.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-md text-label-md text-on-surface-variant">Counter 2 Status:</span>
              <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                Open for Pickup
              </span>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Inventory & Subscriber Intelligence */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          {/* Module 1: Live 86 / Stock Control */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col gap-space-sm border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
                <span className="font-title-lg text-title-lg text-on-surface font-bold">Live 86 / Stock Control</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">Real-time Kiosk Sync</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Instantly 86 items or edit prices across all student apps &amp; self-ordering touchscreens.
            </p>

            <div className="space-y-space-xs mt-space-xs">
              {menuItems.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  className={`p-space-sm rounded-xl flex flex-col gap-space-xs transition-all ${
                    item.inStock ? 'bg-surface-container-low' : 'bg-surface-container-high/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-11 h-11 rounded-lg object-cover flex-shrink-0 ${
                          !item.inStock ? 'grayscale' : ''
                        }`}
                      />
                      <div className="min-w-0">
                        <div className={`font-title-md text-title-md text-on-surface font-bold truncate ${
                          !item.inStock ? 'line-through' : ''
                        }`}>
                          {item.name}
                        </div>
                        {item.inStock && (item.stockCount ?? 0) > 0 ? (
                          (item.stockCount ?? 0) <= 10 ? (
                            <div className="font-label-sm text-label-sm text-amber-600 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              Low Stock ({item.stockCount} left)
                            </div>
                          ) : (
                            <div className="font-label-sm text-label-sm text-secondary font-bold">
                              In Stock ({item.stockCount} left)
                            </div>
                          )
                        ) : (
                          <div className="font-label-sm text-label-sm text-error font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">do_not_disturb_on</span>
                            OUT OF STOCK (86'd)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-black">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>

                  {editingStockItemId === item.id ? (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStockInputValue(prev => Math.max(0, (parseInt(prev, 10) || 0) - 1).toString())}
                        className="w-7 h-7 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs cursor-pointer"
                        title="Decrease 1"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={stockInputValue}
                        onChange={(e) => setStockInputValue(e.target.value)}
                        placeholder="Stock"
                        className="w-16 px-2 py-1 rounded bg-surface-container text-on-surface text-sm border text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setStockInputValue(prev => ((parseInt(prev, 10) || 0) + 1).toString())}
                        className="w-7 h-7 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs cursor-pointer"
                        title="Increase 1"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockInputValue(prev => ((parseInt(prev, 10) || 0) + 20).toString())}
                        className="px-2 py-1 rounded bg-secondary-container text-on-secondary-container text-xs font-bold cursor-pointer"
                        title="Restock +20"
                      >
                        +20
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockInputValue('0')}
                        className="px-2 py-1 rounded bg-error-container text-on-error-container text-xs font-bold cursor-pointer"
                        title="Set Out of Stock"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditStockSubmit(item.id)}
                        className="px-2 py-1 rounded bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStockItemId(null)}
                        className="px-2 py-1 rounded bg-surface-container text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : editingItemId === item.id ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        value={newPriceValue}
                        onChange={(e) => setNewPriceValue(e.target.value)}
                        placeholder={`Price (${item.price})`}
                        className="w-24 px-2 py-1 rounded bg-surface-container text-on-surface text-sm border"
                      />
                      <button
                        onClick={() => handleEditPriceSubmit(item.id)}
                        className="px-2 py-1 rounded bg-primary-container text-on-primary text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="px-2 py-1 rounded bg-surface-container text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-space-xs pt-1 flex-wrap">
                      <button
                        onClick={() => {
                          setEditingStockItemId(item.id);
                          setStockInputValue((item.stockCount ?? 0).toString());
                          setEditingItemId(null);
                        }}
                        className="px-space-xs py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm flex items-center gap-1 font-semibold cursor-pointer"
                        title="Edit stock or restock"
                      >
                        <span className="material-symbols-outlined text-xs">inventory</span> Stock ({item.stockCount})
                      </button>
                      <button
                        onClick={() => {
                          setEditingItemId(item.id);
                          setNewPriceValue(item.price.toString());
                          setEditingStockItemId(null);
                        }}
                        className="px-space-xs py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span> Edit Price
                      </button>
                      <button
                        onClick={() => toggleItemStatus(item.id)}
                        className={`px-space-xs py-1 rounded font-label-sm text-label-sm flex items-center gap-1 font-bold cursor-pointer ${
                          item.inStock
                            ? 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
                            : 'bg-secondary-container text-on-secondary-fixed-variant hover:bg-secondary hover:text-on-secondary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {item.inStock ? 'block' : 'add_task'}
                        </span>
                        <span>{item.inStock ? 'Disable' : 'Toggle Available'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module 2: Cafeteria Plus Subscription Matrix */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col gap-space-md border border-surface-container/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">loyalty</span>
                <span className="font-title-lg text-title-lg text-on-surface font-bold">Subscriber Matrix</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                87 Students
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-label-sm text-label-sm text-on-surface">
                <span>Tier Distribution</span>
                <span className="font-bold">32 Student • 42 Plus • 13 Premium</span>
              </div>
              <div className="h-3 w-full rounded-full bg-surface-container-high flex overflow-hidden">
                <div className="bg-surface-variant h-full" style={{ width: '36.7%' }} title="Student Plan: 32"></div>
                <div className="bg-tertiary-container h-full" style={{ width: '48.3%' }} title="Plus Plan: 42"></div>
                <div className="bg-primary-container h-full" style={{ width: '15%' }} title="Premium Plan: 13"></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-space-2xs text-center pt-2">
              <div className="p-space-xs rounded-xl bg-surface-container-low">
                <span className="font-label-sm text-label-sm text-on-surface-variant block">Basic Pass</span>
                <span className="font-title-md text-title-md text-on-surface font-bold">32</span>
              </div>
              <div className="p-space-xs rounded-xl bg-tertiary-fixed/30 border border-tertiary/20">
                <span className="font-label-sm text-label-sm text-tertiary block font-bold">Plus Active</span>
                <span className="font-title-md text-title-md text-tertiary font-black">42</span>
              </div>
              <div className="p-space-xs rounded-xl bg-primary-fixed/30 border border-primary-container/20">
                <span className="font-label-sm text-label-sm text-primary block font-bold">Premium VIP</span>
                <span className="font-title-md text-title-md text-primary font-black">13</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
