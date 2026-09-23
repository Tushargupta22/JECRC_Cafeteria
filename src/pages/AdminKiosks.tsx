import React, { useState } from 'react';

interface Kiosk {
  id: string;
  name: string;
  location: string;
  ip: string;
  status: 'online' | 'maintenance' | 'offline';
  printerStatus: 'ready' | 'low_paper' | 'error';
  scannerStatus: 'ready' | 'error';
  ordersToday: number;
}

export const AdminKiosks: React.FC = () => {
  const [kiosks, setKiosks] = useState<Kiosk[]>([
    {
      id: 'kiosk-01',
      name: 'Touch Terminal 01',
      location: 'North Campus Entrance Gate',
      ip: '10.20.4.11',
      status: 'online',
      printerStatus: 'ready',
      scannerStatus: 'ready',
      ordersToday: 68
    },
    {
      id: 'kiosk-02',
      name: 'Touch Terminal 02',
      location: 'Central Hall Dining Quad',
      ip: '10.20.4.12',
      status: 'online',
      printerStatus: 'ready',
      scannerStatus: 'ready',
      ordersToday: 94
    },
    {
      id: 'kiosk-03',
      name: 'Touch Terminal 03',
      location: 'Library East Wing Foyer',
      ip: '10.20.4.13',
      status: 'online',
      printerStatus: 'low_paper',
      scannerStatus: 'ready',
      ordersToday: 42
    },
    {
      id: 'kiosk-04',
      name: 'Touch Terminal 04 (Master Kiosk)',
      location: 'Chef Pickup Counter 2',
      ip: '10.20.4.14',
      status: 'online',
      printerStatus: 'ready',
      scannerStatus: 'ready',
      ordersToday: 126
    }
  ]);

  const toggleKioskStatus = (id: string) => {
    setKiosks(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, status: k.status === 'online' ? 'maintenance' : 'online' }
          : k
      )
    );
  };

  const handleTestPrint = (name: string) => {
    alert(`[Print Signal Sent] Test slip emitted on ${name} successfully!`);
  };

  return (
    <div className="flex flex-col w-full py-space-md space-y-space-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            Station Kiosks &amp; Hardware
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Monitor self-service touch terminals, infrared barcode readers, and thermal receipt hardware.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold">
            4 / 4 Kiosks Online
          </span>
        </div>
      </div>

      {/* Kiosk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {kiosks.map(k => (
          <div
            key={k.id}
            className="p-space-lg rounded-3xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow border border-surface-container/60 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary font-bold">
                    <span className="material-symbols-outlined text-xl">kiosk</span>
                  </div>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface font-bold">{k.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{k.location}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 ${
                  k.status === 'online'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-error-container text-on-error-container'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${k.status === 'online' ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
                  {k.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-space-xs my-space-md text-center">
                <div className="p-space-xs rounded-xl bg-surface-container-low">
                  <span className="text-xs text-on-surface-variant block">Thermal Roll</span>
                  <span className={`font-label-md text-label-md font-bold ${
                    k.printerStatus === 'ready' ? 'text-secondary' : 'text-amber-600'
                  }`}>
                    {k.printerStatus === 'ready' ? 'Ready (92%)' : 'Low (18%)'}
                  </span>
                </div>
                <div className="p-space-xs rounded-xl bg-surface-container-low">
                  <span className="text-xs text-on-surface-variant block">QR Scanner</span>
                  <span className="font-label-md text-label-md font-bold text-secondary">
                    Active
                  </span>
                </div>
                <div className="p-space-xs rounded-xl bg-surface-container-low">
                  <span className="text-xs text-on-surface-variant block">Tickets</span>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    {k.ordersToday} orders
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-space-xs border-t border-surface-container">
              <span className="font-mono text-xs text-on-surface-variant">IP: {k.ip}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestPrint(k.name)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold"
                >
                  Test Print
                </button>
                <button
                  onClick={() => toggleKioskStatus(k.id)}
                  className={`px-3 py-1.5 rounded-xl font-label-sm text-label-sm font-bold cursor-pointer ${
                    k.status === 'online'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-secondary-container text-on-secondary-container'
                  }`}
                >
                  {k.status === 'online' ? 'Set Maintenance' : 'Set Online'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
