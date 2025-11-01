/**
 * Returned Log Component
 * Modal/window for viewing historical returns
 * Features:
 * - Date-based navigation
 * - Detailed transaction view
 * - Analytics and reporting
 * - Export functionality
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Loader } from './icons';
import BatchAgeIndicator from './BatchAgeIndicator';

const ReturnedLog = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    if (isOpen) {
      loadReturns();
    }
  }, [isOpen, dateRange]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabaseClient
        .from('returns')
        .select(`
          *,
          users:processed_by (
            first_name,
            last_name
          )
        `)
        .order('processed_at', { ascending: false });

      if (dateRange.start) {
        query = query.gte('return_date', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('return_date', dateRange.end);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setReturns(data || []);
    } catch (err) {
      console.error('Error loading returns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getReturnsGroupedByDate = () => {
    const grouped = {};
    
    returns.forEach(ret => {
      const dateStr = ret.return_date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          date: dateStr,
          transactions: [],
          totalValue: 0,
          totalQuantity: 0,
          totalBatches: 0
        };
      }
      grouped[dateStr].transactions.push(ret);
      grouped[dateStr].totalValue += parseFloat(ret.total_value);
      grouped[dateStr].totalQuantity += parseFloat(ret.total_quantity);
      grouped[dateStr].totalBatches += ret.total_batches;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  };

  const loadReturnDetails = async (returnId) => {
    try {
      const { data: items, error: itemsError } = await supabaseClient
        .from('return_items')
        .select('*')
        .eq('return_id', returnId)
        .order('id', { ascending: true });

      if (itemsError) throw itemsError;

      const returnRecord = returns.find(r => r.id === returnId);
      setSelectedReturn({ return: returnRecord, items: items || [] });
    } catch (err) {
      console.error('Error loading return details:', err);
      alert('Error loading return details');
    }
  };

  const handleDateSelect = async (dateData) => {
    if (selectedDate === dateData.date) {
      setSelectedDate(null);
      setSelectedReturn(null);
    } else {
      setSelectedDate(dateData.date);
      // Load first transaction details by default
      if (dateData.transactions.length > 0) {
        await loadReturnDetails(dateData.transactions[0].id);
      }
    }
  };

  const handleTransactionSelect = async (returnId) => {
    await loadReturnDetails(returnId);
  };

  const calculateAnalytics = () => {
    if (returns.length === 0) {
      return {
        totalValue: 0,
        averageValue: 0,
        totalReturns: 0
      };
    }

    const totalValue = returns.reduce((sum, ret) => sum + parseFloat(ret.total_value), 0);
    return {
      totalValue,
      averageValue: totalValue / returns.length,
      totalReturns: returns.length
    };
  };

  const analytics = calculateAnalytics();
  const groupedByDate = getReturnsGroupedByDate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📋 Returned Log</h2>
            <p className="text-sm text-gray-600 mt-1">
              View and analyze historical returns
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Analytics */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">{analytics.totalReturns}</div>
              <div className="text-sm text-gray-600">Total Returns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700">Rs. {analytics.totalValue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700">Rs. {analytics.averageValue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Average per Return</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Date List Sidebar */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="font-bold text-gray-900 mb-4">Return Dates</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : groupedByDate.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No returns found</p>
            ) : (
              <div className="space-y-2">
                {groupedByDate.map((dateData) => (
                  <button
                    key={dateData.date}
                    onClick={() => handleDateSelect(dateData)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      selectedDate === dateData.date 
                        ? 'bg-blue-100 border-blue-500' 
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">
                      {new Date(dateData.date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {dateData.transactions.length} transaction{dateData.transactions.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {dateData.totalBatches} batches, {dateData.totalQuantity} units
                      </span>
                      <span className="font-bold text-green-700">
                        Rs. {dateData.totalValue.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedReturn && selectedReturn.return ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {new Date(selectedReturn.return.processed_at).toLocaleString()}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Processed By</div>
                      <div className="font-semibold">
                        {selectedReturn.return.users?.first_name} {selectedReturn.return.users?.last_name}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Total Value</div>
                      <div className="font-bold text-green-700">
                        Rs. {parseFloat(selectedReturn.return.total_value).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-semibold">Product</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold">Quantity</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold">Age (Days)</th>
                        <th className="text-right py-3 px-2 text-sm font-semibold">Original Price</th>
                        <th className="text-right py-3 px-2 text-sm font-semibold">Sale Price</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold">Return %</th>
                        <th className="text-right py-3 px-2 text-sm font-semibold">Return Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReturn.items || []).map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-3 px-2 font-medium">{item.product_name}</td>
                          <td className="py-3 px-2 text-center">{item.quantity}</td>
                          <td className="py-3 px-2 text-center">
                            <BatchAgeIndicator age={item.age_at_return} />
                          </td>
                          <td className="py-3 px-2 text-right">Rs. {parseFloat(item.original_price).toFixed(2)}</td>
                          <td className="py-3 px-2 text-right">Rs. {parseFloat(item.sale_price).toFixed(2)}</td>
                          <td className="py-3 px-2 text-center">{item.return_percentage}%</td>
                          <td className="py-3 px-2 text-right font-semibold text-green-700">
                            Rs. {parseFloat(item.total_return_value).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a date to view return details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnedLog;

