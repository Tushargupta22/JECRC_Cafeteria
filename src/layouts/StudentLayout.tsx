import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { SearchModal } from '../components/common/SearchModal';
import { CartTray } from '../components/menu/CartTray';
import { ReceiptModal } from '../components/orders/ReceiptModal';
import { AuthModal } from '../components/common/AuthModal';
import { EditProfileModal } from '../components/common/EditProfileModal';
import { useCart } from '../context/CartContext';
import { useStudent } from '../context/StudentContext';

export const StudentLayout: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isCartDrawerOpen, setIsCartDrawerOpen } = useCart();
  const { isAuthModalOpen, closeAuthModal, isEditProfileOpen, closeEditProfileModal } = useStudent();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header onOpenSearch={() => setIsSearchOpen(true)} />
      
      <main className="flex-1 w-full pt-28">
        <Outlet />
      </main>

      <Footer />

      {/* Global Drawers & Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {isCartDrawerOpen && (
        <CartTray
          isDrawer={true}
          onClose={() => setIsCartDrawerOpen(false)}
        />
      )}

      <ReceiptModal />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={closeEditProfileModal}
      />
    </div>
  );
};
