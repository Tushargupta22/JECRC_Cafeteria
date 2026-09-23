import React from 'react';
import { Link } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useStudent } from '../context/StudentContext';

export const TrackOrder: React.FC = () => {
  const { activeOrder, secondsRemaining, setIsReceiptModalOpen, orderHistory } = useOrder();
  const { isAuthenticated, openAuthModal } = useStudent();

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return '🍔 Ready at Counter 2!';
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `⏱ ${mins}m ${remainder < 10 ? '0' : ''}${remainder}s remaining`;
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full bg-surface min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container p-8 rounded-3xl shadow-xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-2">
            Sign In to Track Orders
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
            Real-time kitchen broadcast, pickup token status, and digital GST invoices are linked to your university account.
          </p>
          <div className="w-full space-y-3">
            <button
              onClick={() => openAuthModal('login', 'student')}
              className="w-full py-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              <span>Sign In to Your Account</span>
            </button>
            <Link
              to="/menu"
              className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Explore Cafeteria Menu</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface min-h-screen">
      <div className="w-full max-w-container-max mx-auto px-gutter-desktop py-space-xl space-y-space-2xl">
        {/* Live Kitchen Ticket Card */}
        {activeOrder ? (
          <div className="w-full bg-surface-container-lowest rounded-3xl p-space-lg md:p-space-xl shadow-xl relative overflow-hidden border border-surface-container/60">
            {/* Ambient Background Glows */}
            <div className="absolute -right-24 -top-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-secondary-container/15 rounded-full blur-2xl pointer-events-none"></div>

            {/* Ticket Header & Status */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-space-md mb-space-xl relative z-10">
              <div className="space-y-space-2xs">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className="px-space-xs py-0.5 rounded-full bg-primary-container/15 text-primary font-label-md text-label-md font-bold">
                    LIVE KITCHEN TICKET
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Order {activeOrder.orderNumber}
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-body-md text-body-md text-on-surface-variant font-medium">
                    {activeOrder.station}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-2xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                  <span>Real-time kitchen broadcast synced with Counter Display</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-space-md">
                <div className="flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-2xl shadow-sm">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Pickup Token
                  </span>
                  <div className="font-headline-lg text-headline-lg text-primary tracking-tight font-black leading-none ml-1">
                    {activeOrder.tokenNumber}
                  </div>
                </div>

                <div className="flex items-center gap-space-xs bg-primary-container text-on-primary px-space-md py-space-xs rounded-2xl shadow-md">
                  <span className="material-symbols-outlined text-xl animate-spin" style={{ animationDuration: '3s' }}>
                    timer
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm leading-none opacity-90">Estimated ETA</span>
                    <span className="font-title-md text-title-md font-bold leading-tight">
                      {formatCountdown(secondsRemaining)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Stage Visual Timeline */}
            <div className="relative z-10 mb-space-2xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md relative">
                {/* Step 1: Order Placed */}
                <div className={`flex flex-col p-space-md rounded-2xl transition-all ${
                  activeOrder.status === 'new'
                    ? 'bg-surface-container-lowest shadow-lg border-2 border-primary-container/40'
                    : 'bg-surface-container-low'
                }`}>
                  <div className="flex items-center justify-between mb-space-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md shadow-sm ${
                      activeOrder.status !== 'new'
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-primary-container text-on-primary'
                    }`}>
                      <span className="material-symbols-outlined text-sm font-bold">
                        {activeOrder.status !== 'new' ? 'check' : 'receipt'}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold">
                      {activeOrder.createdAt}
                    </span>
                  </div>
                  <div className="font-title-md text-title-md text-on-surface font-bold">Order Placed</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">Kitchen Received &amp; Verified</p>
                </div>

                {/* Step 2: Preparing on Grill */}
                <div className={`flex flex-col p-space-md rounded-2xl transition-all ${
                  activeOrder.status === 'preparing'
                    ? 'bg-surface-container-lowest shadow-lg border-2 border-primary-container/60'
                    : activeOrder.status === 'ready' || activeOrder.status === 'completed'
                    ? 'bg-surface-container-low'
                    : 'bg-surface-container-low opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-space-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md shadow-sm ${
                      activeOrder.status === 'ready' || activeOrder.status === 'completed'
                        ? 'bg-secondary text-on-secondary'
                        : activeOrder.status === 'preparing'
                        ? 'bg-primary-container text-on-primary shadow-[0_0_16px_rgba(255,94,58,0.5)]'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${activeOrder.status === 'preparing' ? 'animate-pulse' : ''}`}>
                        {activeOrder.status === 'ready' || activeOrder.status === 'completed' ? 'check' : 'skillet'}
                      </span>
                    </div>
                    <span className={`font-label-sm text-label-sm px-space-xs py-0.5 rounded-full font-bold ${
                      activeOrder.status === 'preparing'
                        ? 'bg-primary-container/20 text-primary'
                        : 'text-on-surface-variant'
                    }`}>
                      {activeOrder.status === 'preparing' ? 'ACTIVE' : activeOrder.status === 'ready' || activeOrder.status === 'completed' ? 'Done' : 'Queued'}
                    </span>
                  </div>
                  <div className={`font-title-md text-title-md font-bold ${activeOrder.status === 'preparing' ? 'text-primary' : 'text-on-surface'}`}>
                    Preparing on Grill
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                    Chef Marco assembling fresh order
                  </p>
                </div>

                {/* Step 3: Ready at Counter */}
                <div className={`flex flex-col p-space-md rounded-2xl transition-all ${
                  activeOrder.status === 'ready'
                    ? 'bg-secondary-container text-on-secondary-container shadow-md border-2 border-secondary'
                    : activeOrder.status === 'completed'
                    ? 'bg-surface-container-low'
                    : 'bg-surface-container-low opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-space-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${
                      activeOrder.status === 'completed'
                        ? 'bg-secondary text-on-secondary'
                        : activeOrder.status === 'ready'
                        ? 'bg-secondary text-on-secondary animate-bounce'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {activeOrder.status === 'completed' ? 'check' : 'lunch_dining'}
                      </span>
                    </div>
                    <span className={`font-label-sm text-label-sm font-bold ${activeOrder.status === 'ready' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {activeOrder.status === 'ready' ? 'READY NOW' : activeOrder.status === 'completed' ? 'Collected' : 'Pending'}
                    </span>
                  </div>
                  <div className="font-title-md text-title-md text-on-surface font-bold">Ready at Counter</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                    Present Token {activeOrder.tokenNumber} to collect
                  </p>
                </div>

                {/* Step 4: Completed */}
                <div className={`flex flex-col p-space-md rounded-2xl transition-all ${
                  activeOrder.status === 'completed'
                    ? 'bg-surface-container-lowest shadow-md border-2 border-secondary'
                    : 'bg-surface-container-low opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-space-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${
                      activeOrder.status === 'completed'
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-sm">done_all</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {activeOrder.status === 'completed' ? 'Delivered' : 'Awaiting pickup'}
                    </span>
                  </div>
                  <div className="font-title-md text-title-md text-on-surface font-bold">Completed &amp; Enjoyed</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                    Loyalty points credited to wallet
                  </p>
                </div>
              </div>
            </div>

            {/* Tray Contents & Payment Row */}
            <div className="pt-space-md bg-surface-container-low p-space-md rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-space-md relative z-10">
              <div className="flex flex-wrap items-center gap-space-sm">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                  Tray Contents:
                </span>
                {activeOrder.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-space-2xs bg-surface-container-lowest px-space-xs py-1 rounded-full shadow-sm"
                  >
                    <span className={`w-2 h-2 rounded-full ${idx % 2 === 0 ? 'bg-secondary' : 'bg-primary-container'}`}></span>
                    <span className="font-title-md text-title-md text-on-surface font-medium">{it.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-space-md">
                <div className="text-right">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">Razorpay Confirmed</span>
                  <span className="font-headline-sm text-headline-sm text-secondary font-black">
                    ₹{activeOrder.totalAmount}.00
                  </span>
                </div>
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="flex items-center gap-space-2xs px-space-md py-space-xs rounded-full bg-surface-container-highest text-on-surface hover:bg-surface-container transition-all font-label-md text-label-md shadow-sm font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  <span>Digital Receipt</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-space-3xl bg-surface-container-lowest rounded-3xl text-center shadow-md">
            <span className="material-symbols-outlined text-6xl text-outline mb-2">fastfood</span>
            <h2 className="font-headline-md text-headline-md font-bold">No Active Kitchen Ticket</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-md mx-auto">
              You haven't placed an order yet this lunch session. Browse the cafeteria menu to order fresh meals.
            </p>
            <Link
              to="/menu"
              className="mt-6 inline-flex items-center gap-2 px-space-lg py-3 rounded-full bg-primary-container text-on-primary font-bold shadow-md hover:bg-primary"
            >
              <span>Explore Cafeteria Menu</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Previous Orders History */}
        <section className="space-y-space-md">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Recent Meal History</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {orderHistory.map(order => (
              <div
                key={order.id}
                className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow border border-surface-container/60"
              >
                <div className="flex justify-between items-center mb-space-xs">
                  <span className="font-title-md text-title-md font-bold text-primary">{order.tokenNumber}</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">
                    {order.createdAt}
                  </span>
                </div>
                <div className="font-label-md text-label-md text-on-surface font-semibold mb-1">
                  {order.customerName} • {order.orderNumber}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                  {order.items.map(i => i.name).join(', ')}
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-surface-container font-label-sm text-label-sm">
                  <span className="text-secondary font-bold">₹{order.totalAmount}.00</span>
                  <span className="text-on-surface-variant">{order.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
