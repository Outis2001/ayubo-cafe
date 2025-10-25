/**
 * Customer Portal Main Application
 * 
 * Main container for the customer-facing portal.
 * Handles navigation, authentication checks, and routing between customer views.
 * Designed mobile-first with a customer-friendly interface.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerSignup from './CustomerSignup';
import CustomerLogin from './CustomerLogin';
import ProductGallery from './ProductGallery';
import ProductDetail from './ProductDetail';
import { Loader } from '../icons';

// Icons for customer navigation
const HomeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ShoppingBagIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const ClockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CakeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21V10H4v11" />
    <path d="M4 15h16" />
    <path d="M12 10V3M9 3l3-3 3 3" />
  </svg>
);

const LogOutIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/**
 * CustomerApp Component
 * 
 * Main customer portal container with navigation and view routing
 */
const CustomerApp = () => {
  const { currentCustomer, isAuthenticated, loading, logout } = useCustomerAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState('products'); // 'products', 'cart', 'orders', 'profile', 'custom-request', 'quotes'
  const [showAuthMode, setShowAuthMode] = useState('login'); // 'login' or 'signup'
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Product detail state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  // Reset to products view when logging in
  useEffect(() => {
    if (isAuthenticated) {
      setCurrentView('products');
    }
  }, [isAuthenticated]);

  /**
   * Handle logout with confirmation
   */
  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      setCurrentView('products');
    }
  };

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    setCurrentView('products');
  };

  /**
   * Handle product click - open detail modal
   */
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  /**
   * Handle add to cart
   */
  const handleAddToCart = async ({ product, pricing, quantity }) => {
    console.log('Adding to cart:', { product, pricing, quantity });
    // TODO: Implement cart context and add to cart logic
    // For now, just log
    alert(`Added ${quantity}x ${product.name} (${pricing.weight}) to cart!`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-purple-700 font-semibold">Loading Ayubo Cafe...</p>
        </div>
      </div>
    );
  }

  // Authentication screens
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        {/* Header */}
        <div className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 text-center">
              🍰 Ayubo Cafe
            </h1>
            <p className="text-center text-gray-600 text-sm mt-1">
              Order delicious cakes & treats
            </p>
          </div>
        </div>

        {/* Auth forms */}
        <div className="max-w-md mx-auto px-4 py-8">
          {showAuthMode === 'login' ? (
            <CustomerLogin
              onLoginSuccess={handleAuthSuccess}
              onSwitchToSignup={() => setShowAuthMode('signup')}
            />
          ) : (
            <CustomerSignup
              onSignupSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setShowAuthMode('login')}
            />
          )}
        </div>
      </div>
    );
  }

  // Main customer portal (authenticated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 pb-20 sm:pb-6">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Greeting */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                🍰 Ayubo Cafe
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Welcome, {currentCustomer?.first_name || 'Guest'}!
              </p>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('products')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentView === 'products'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                <HomeIcon size={18} />
                <span className="text-sm font-medium">Products</span>
              </button>

              <button
                onClick={() => setCurrentView('custom-request')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentView === 'custom-request'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                <CakeIcon size={18} />
                <span className="text-sm font-medium">Custom Cake</span>
              </button>

              <button
                onClick={() => setCurrentView('orders')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentView === 'orders'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                <ClockIcon size={18} />
                <span className="text-sm font-medium">My Orders</span>
              </button>

              <button
                onClick={() => setCurrentView('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentView === 'profile'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-purple-100'
                }`}
              >
                <UserIcon size={18} />
                <span className="text-sm font-medium">Profile</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
              >
                <LogOutIcon size={18} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden text-gray-700 p-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showMobileMenu ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <div className="sm:hidden mt-3 pt-3 border-t border-gray-200">
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setCurrentView('products');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentView === 'products'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-purple-100'
                  }`}
                >
                  <HomeIcon size={20} />
                  <span className="font-medium">Browse Products</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('custom-request');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentView === 'custom-request'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-purple-100'
                  }`}
                >
                  <CakeIcon size={20} />
                  <span className="font-medium">Custom Cake Request</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('orders');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentView === 'orders'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-purple-100'
                  }`}
                >
                  <ClockIcon size={20} />
                  <span className="font-medium">My Orders</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentView === 'profile'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-purple-100'
                  }`}
                >
                  <UserIcon size={20} />
                  <span className="font-medium">My Profile</span>
                </button>

                <div className="border-t border-gray-200 pt-1 mt-1">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOutIcon size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        {currentView === 'products' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-4">
              Browse Our Products
            </h2>
            <ProductGallery 
              onProductClick={handleProductClick}
            />
          </div>
        )}

        {currentView === 'custom-request' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-4">
              Custom Cake Request
            </h2>
            <div className="text-center py-12 text-gray-500">
              <CakeIcon size={48} className="mx-auto mb-4 text-purple-300" />
              <p className="text-lg font-medium">Custom Cake Form Coming Soon</p>
              <p className="text-sm mt-2">
                Request a custom-designed cake for your special occasion
              </p>
            </div>
          </div>
        )}

        {currentView === 'orders' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-4">
              My Orders
            </h2>
            <div className="text-center py-12 text-gray-500">
              <ClockIcon size={48} className="mx-auto mb-4 text-purple-300" />
              <p className="text-lg font-medium">Order History Coming Soon</p>
              <p className="text-sm mt-2">
                Track your orders and view order history
              </p>
            </div>
          </div>
        )}

        {currentView === 'profile' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-4">
              My Profile
            </h2>
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentCustomer?.first_name} {currentCustomer?.last_name}
                </p>
              </div>
              <div className="border-b border-gray-200 pb-4">
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentCustomer?.phone_number}
                </p>
              </div>
              {currentCustomer?.email && (
                <div className="border-b border-gray-200 pb-4">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {currentCustomer.email}
                  </p>
                </div>
              )}
              {currentCustomer?.birthday && (
                <div className="border-b border-gray-200 pb-4">
                  <p className="text-sm text-gray-600">Birthday</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(currentCustomer.birthday).toLocaleDateString()}
                  </p>
                </div>
              )}
              {currentCustomer?.address && (
                <div className="border-b border-gray-200 pb-4">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {currentCustomer.address}
                  </p>
                </div>
              )}
              <div className="pt-4">
                <p className="text-sm text-gray-500">
                  Profile editing features coming soon
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setCurrentView('products')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'products' ? 'text-purple-600' : 'text-gray-600'
            }`}
          >
            <HomeIcon size={22} />
            <span className="text-xs font-medium">Products</span>
          </button>

          <button
            onClick={() => setCurrentView('custom-request')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'custom-request' ? 'text-purple-600' : 'text-gray-600'
            }`}
          >
            <CakeIcon size={22} />
            <span className="text-xs font-medium">Custom</span>
          </button>

          <button
            onClick={() => setCurrentView('orders')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'orders' ? 'text-purple-600' : 'text-gray-600'
            }`}
          >
            <ClockIcon size={22} />
            <span className="text-xs font-medium">Orders</span>
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              currentView === 'profile' ? 'text-purple-600' : 'text-gray-600'
            }`}
          >
            <UserIcon size={22} />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>

      {/* Product Detail Modal */}
      {showProductDetail && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => {
            setShowProductDetail(false);
            setSelectedProduct(null);
          }}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
};

export default CustomerApp;

