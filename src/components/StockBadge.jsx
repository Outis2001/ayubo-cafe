import { getStockStatus, getStockStatusColors } from '../utils/inventory';

/**
 * StockBadge Component
 * Displays stock quantity with color-coded status and warning icons
 * 
 * @param {Object} product - Product object with stock_quantity, low_stock_threshold, is_weight_based
 * @param {boolean} showFullText - Whether to show "Stock" or abbreviated "Stk" (for mobile)
 */
const StockBadge = ({ product, showFullText = true }) => {
  if (!product) return null;

  const quantity = product.stock_quantity ?? 0;
  
  // Don't show badge if stock info is not available
  if (product.stock_quantity === undefined || product.stock_quantity === null) {
    return null;
  }

  const status = getStockStatus(product);
  const colors = getStockStatusColors(status);

  /**
   * Format stock display based on product type
   * Unit-based: "Stock: 25" or "Stk: 25"
   * Weight-based: "Stock: 2.5 kg" or "Stk: 2.5 kg"
   */
  const formatStockDisplay = () => {
    const prefix = showFullText ? 'Stock: ' : 'Stk: ';
    
    if (product.is_weight_based) {
      return `${prefix}${quantity} kg`;
    }
    
    return `${prefix}${quantity}`;
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.badge}`}>
      {status === 'out' && (
        <span className="mr-0.5 text-[10px]">⛔</span>
      )}
      {status === 'low' && quantity > 0 && (
        <span className="mr-0.5 text-[10px]">⚠️</span>
      )}
      {status === 'out' ? 'Out of Stock' : formatStockDisplay()}
    </span>
  );
};

export default StockBadge;

