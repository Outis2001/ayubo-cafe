import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CustomerApp from './components/customer/CustomerApp.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CustomerAuthProvider } from './context/CustomerAuthContext.jsx'
import { CustomerOrderProvider } from './context/CustomerOrderContext.jsx'
import './index.css'

// Simple router: Check URL path to determine which app to render
const AppRouter = () => {
  const isCustomerPortal = window.location.pathname.startsWith('/customer');
  
  if (isCustomerPortal) {
    return (
      <CustomerAuthProvider>
        <CustomerOrderProvider>
          <CustomerApp />
        </CustomerOrderProvider>
      </CustomerAuthProvider>
    );
  }
  
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)

