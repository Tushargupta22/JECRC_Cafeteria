import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { StudentProvider } from './context/StudentContext';
import { AdminKitchenProvider } from './context/AdminKitchenContext';
import { OwnerProvider } from './context/OwnerContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <StudentProvider>
        <AdminKitchenProvider>
          <OwnerProvider>
            <CartProvider>
              <OrderProvider>
                <AppRoutes />
              </OrderProvider>
            </CartProvider>
          </OwnerProvider>
        </AdminKitchenProvider>
      </StudentProvider>
    </BrowserRouter>
  );
};

export default App;
