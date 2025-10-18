/**
 * SalesBadge Component
 * 
 * Displays sales quantity badge for products (owner-only).
 * Shows different formats based on device type:
 * - Desktop: "Sold: X" or "Sold: X kg" 
 * - Mobile: Fire emoji 🔥 for sales > 5
 * - Zero sales: No badge (component hidden)
 * 
 * @component
 */

import { useState, useEffect } from 'react';

/**
 * SalesBadge - Sales performance indicator badge
 * 
 * @param {Object} props
 * @param {Object} props.product - Product object with is_weight_based property
 * @param {number} props.salesQuantity - Total quantity sold
 * @param {boolean} props.isMobile - Whether to use mobile mode (fire emoji)
 * @returns {JSX.Element|null} Badge element or null if no sales
 */
const SalesBadge = ({ product, salesQuantity = 0, isMobile = false }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Detect mobile viewport if isMobile not explicitly provided
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640); // 640px = Tailwind 'sm' breakpoint
    };

    // Initial check
    checkScreenSize();

    // Listen for window resize
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Hide badge if no sales
  if (salesQuantity === 0 || salesQuantity === null || salesQuantity === undefined) {
    return null;
  }

  // Determine if we should use mobile mode
  const useMobileMode = isMobile || isSmallScreen;

  // Mobile mode: Show fire emoji only for sales > 5
  if (useMobileMode) {
    if (salesQuantity > 5) {
      return (
        <span 
          className="inline-flex items-center justify-center text-lg"
          title={`Sold: ${salesQuantity}${product?.is_weight_based ? ' kg' : ''}`}
        >
          🔥
        </span>
      );
    }
    // Don't show badge for 1-5 sales on mobile
    return null;
  }

  // Desktop mode: Show full text
  const formatSalesText = () => {
    if (product?.is_weight_based) {
      return `Sold: ${salesQuantity} kg`;
    }
    return `Sold: ${salesQuantity}`;
  };

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-300">
      {formatSalesText()}
    </span>
  );
};

export default SalesBadge;

