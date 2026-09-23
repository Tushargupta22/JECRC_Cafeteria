import React from 'react';
import { useOrder } from '../../context/OrderContext';

export const ReceiptModal: React.FC = () => {
  const { isReceiptModalOpen, setIsReceiptModalOpen, activeOrder } = useOrder();

  if (!isReceiptModalOpen || !activeOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl shadow-2xl p-space-lg relative border border-surface-container">
        {/* Close Button */}
        <button
          onClick={() => setIsReceiptModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Brand & Title */}
        <div className="text-center pb-space-md border-b border-dashed border-surface-container">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-fixed mb-space-xs text-primary font-black">
            JC
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">JECRC Cafeteria</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Campus Central Dining Hall • JECRC University
          </p>
          <div className="mt-2 inline-block px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
            Verified Tax Invoice &amp; Token
          </div>
        </div>

        {/* Token & Order Details */}
        <div className="py-space-md flex justify-between items-center bg-surface-container-low px-space-md rounded-2xl my-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Token Number</span>
            <div className="font-headline-lg text-headline-lg text-primary font-black leading-none mt-0.5">
              {activeOrder.tokenNumber}
            </div>
          </div>
          <div className="text-right">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Order ID</span>
            <div className="font-title-md text-title-md text-on-surface font-bold">
              {activeOrder.orderNumber}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-space-xs py-space-xs border-b border-surface-container">
          <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant uppercase">
            <span>Item</span>
            <span>Qty</span>
          </div>
          {activeOrder.items.map((item, idx) => (
            <div key={idx} className="flex justify-between font-title-md text-title-md text-on-surface">
              <span>{item.name}</span>
              <span className="font-bold text-primary">×{item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="py-space-sm space-y-1 font-body-sm text-body-sm text-on-surface-variant border-b border-dashed border-surface-container">
          <div className="flex justify-between">
            <span>Payment Mode</span>
            <span className="font-semibold text-on-surface">{activeOrder.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className="font-bold text-secondary">PAID &amp; CONFIRMED</span>
          </div>
          <div className="flex justify-between items-baseline pt-2">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Total Paid</span>
            <span className="font-headline-md text-headline-md text-primary font-black">
              ₹{activeOrder.totalAmount}.00
            </span>
          </div>
        </div>

        {/* Simulated Barcode */}
        <div className="pt-space-md flex flex-col items-center">
          <div className="w-64 h-12 bg-surface-container flex items-center justify-center rounded-lg tracking-widest font-mono text-sm font-bold text-on-surface">
            ||||| | |||| || ||| |||| | |||
          </div>
          <span className="text-[10px] text-on-surface-variant mt-1 font-mono">
            TXN_RAZORPAY_{activeOrder.orderNumber.replace('#', '')}_JECRC
          </span>
        </div>

        {/* Actions */}
        <div className="mt-space-md flex gap-space-sm">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Print Receipt</span>
          </button>
          <button
            onClick={() => setIsReceiptModalOpen(false)}
            className="flex-1 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold hover:bg-primary transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
