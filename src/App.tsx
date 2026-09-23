import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { StudentProvider } from './context/StudentContext';
import { AdminKitchenProvider } from './context/AdminKitchenContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <StudentProvider>
        <AdminKitchenProvider>
          <CartProvider>
            <OrderProvider>
              <AppRoutes />
            </OrderProvider>
          </CartProvider>
        </AdminKitchenProvider>
      </StudentProvider>
    </BrowserRouter>
  );
};

export default App;
