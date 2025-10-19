/**
 * Sales Page Component
 * 
 * Displays sales analytics and reports including:
 * - Today's sales summary
 * - Total sales summary
 * - Item-wise sales breakdown
 * - Recent bills history
 * 
 * Owner-only feature
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { TrendingUp, Trash2, X } from './icons';

const SalesPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('orders')
        .select(`
          order_id,
          order_date,
          value,
          order_items (
            order_item_id,
            product_id,
            quantity,
            subtotal,
            products (
              name
            )
          )
        `)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDailySales = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const todayOrders = bills.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= todayStart && orderDate <= todayEnd;
    });
    
    const total = todayOrders.reduce((sum, order) => sum + parseFloat(order.value), 0);
    return { count: todayOrders.length, total: total.toFixed(2) };
  };

  const getTotalSales = () => {
    const total = bills.reduce((sum, order) => sum + parseFloat(order.value), 0);
    return { count: bills.length, total: total.toFixed(2) };
  };

  const getItemWiseSales = () => {
    const itemSales = {};
    bills.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const productName = item.products?.name || 'Unknown';
          if (!itemSales[productName]) {
            itemSales[productName] = { quantity: 0, revenue: 0 };
          }
          itemSales[productName].quantity += parseFloat(item.quantity);
          itemSales[productName].revenue += parseFloat(item.subtotal);
        });
      }
    });
    return Object.entries(itemSales).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.revenue - a.revenue);
  };

  const getUniqueBills = () => {
    return bills.map(order => ({
      id: order.order_id,
      date: new Date(order.order_date).toLocaleString(),
      total: parseFloat(order.value),
      items: order.order_items || []
    }));
  };

  const deleteBill = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabaseClient
        .from('orders')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;

      await loadBills();
      alert('Order deleted successfully!');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-center text-gray-600">Loading sales data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-700 flex items-center gap-2">
            <TrendingUp size={28} className="sm:w-8 sm:h-8" />
            Sales Reports
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Analytics and sales performance</p>
        </div>

        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border-2 border-green-200">
            <h3 className="text-sm text-gray-600 mb-1">Today's Sales</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-700">Rs. {getDailySales().total}</p>
            <p className="text-sm text-gray-500">{getDailySales().count} bills</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <h3 className="text-sm text-gray-600 mb-1">Total Sales</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700">Rs. {getTotalSales().total}</p>
            <p className="text-sm text-gray-500">{getTotalSales().count} bills</p>
          </div>
        </div>

        {/* Item-wise Sales */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-4">Item-wise Sales</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <tr>
                  <th className="text-left p-2 sm:p-3 text-sm">Item</th>
                  <th className="text-center p-2 sm:p-3 text-sm">Qty</th>
                  <th className="text-right p-2 sm:p-3 text-sm">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {getItemWiseSales().length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-gray-500">
                      No sales data available
                    </td>
                  </tr>
                ) : (
                  getItemWiseSales().map((item, idx) => (
                    <tr key={idx} className="border-t border-green-100 hover:bg-green-50">
                      <td className="p-2 sm:p-3 text-sm">{item.name}</td>
                      <td className="text-center p-2 sm:p-3 text-sm">{item.quantity.toFixed(2)}</td>
                      <td className="text-right p-2 sm:p-3 font-semibold text-sm">Rs. {item.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-green-800 mb-4">Recent Bills</h3>
          <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
            {getUniqueBills().length === 0 ? (
              <p className="text-center py-8 text-gray-500">No bills found</p>
            ) : (
              getUniqueBills().map(bill => (
                <div key={bill.id} className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-green-200 hover:border-green-400 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <span className="text-xs sm:text-sm text-gray-600">{bill.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-700 text-sm sm:text-base">Rs. {bill.total.toFixed(2)}</span>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete bill"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {bill.items.map((item, idx) => 
                      `${item.products?.name || 'Unknown'} x${item.quantity}${idx < bill.items.length - 1 ? ', ' : ''}`
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;

