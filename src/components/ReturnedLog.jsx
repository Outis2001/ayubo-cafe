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
import { undoReturn } from '../utils/returns';

const ReturnedLog = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'trends', 'products'
  const [productFilter, setProductFilter] = useState('');
  const [valueRangeFilter, setValueRangeFilter] = useState({ min: '', max: '' });
  const [showArchived, setShowArchived] = useState(false); // Show returns older than 1 month
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (isOpen) {
      loadReturns();
    }
  }, [isOpen, dateRange]);

  // Reset to page 1 when filters or archived toggle changes
  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived, productFilter, valueRangeFilter]);

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

      // Also load all return items for analytics
      const returnIds = (data || []).map(r => r.id);
      if (returnIds.length > 0) {
        const { data: items, error: itemsError } = await supabaseClient
          .from('return_items')
          .select('*')
          .in('return_id', returnIds);

        if (!itemsError) {
          setReturnItems(items || []);
        }
      } else {
        setReturnItems([]);
      }
    } catch (err) {
      console.error('Error loading returns:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getReturnsGroupedByDate = () => {
    const grouped = {};
    
    // Calculate the date 30 days ago for archiving
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    returns.forEach(ret => {
      // Filter archived returns based on showArchived flag
      const returnDate = new Date(ret.return_date);
      const isArchived = returnDate < thirtyDaysAgo;
      
      if (!showArchived && isArchived) {
        return; // Skip archived returns if not showing archived
      }
      
      const dateStr = ret.return_date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          date: dateStr,
          transactions: [],
          totalValue: 0,
          totalQuantity: 0,
          totalBatches: 0,
          isArchived
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
    // Apply filters to items
    let filteredItems = returnItems;

    // Filter by product name
    if (productFilter.trim()) {
      filteredItems = filteredItems.filter(item => 
        item.product_name?.toLowerCase().includes(productFilter.toLowerCase())
      );
    }

    // Filter by value range
    if (valueRangeFilter.min !== '') {
      const minValue = parseFloat(valueRangeFilter.min);
      if (!isNaN(minValue)) {
        filteredItems = filteredItems.filter(item => 
          parseFloat(item.total_return_value) >= minValue
        );
      }
    }
    if (valueRangeFilter.max !== '') {
      const maxValue = parseFloat(valueRangeFilter.max);
      if (!isNaN(maxValue)) {
        filteredItems = filteredItems.filter(item => 
          parseFloat(item.total_return_value) <= maxValue
        );
      }
    }

    if (returns.length === 0) {
      return {
        totalValue: 0,
        averageValue: 0,
        totalReturns: 0,
        trends: [],
        products: [],
        averageAge: 0,
        filteredItems: []
      };
    }

    const totalValue = returns.reduce((sum, ret) => sum + parseFloat(ret.total_value), 0);

    // Calculate trends (daily values)
    const dailyValues = {};
    returns.forEach(ret => {
      const dateStr = ret.return_date;
      if (!dailyValues[dateStr]) {
        dailyValues[dateStr] = { value: 0, count: 0 };
      }
      dailyValues[dateStr].value += parseFloat(ret.total_value);
      dailyValues[dateStr].count += 1;
    });

    const trends = Object.entries(dailyValues)
      .map(([date, data]) => ({
        date,
        value: data.value,
        count: data.count
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate most frequently returned products (use filtered items)
    const productStats = {};
    filteredItems.forEach(item => {
      const productName = item.product_name || 'Unknown';
      if (!productStats[productName]) {
        productStats[productName] = {
          name: productName,
          count: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }
      productStats[productName].count += 1;
      productStats[productName].totalQuantity += parseFloat(item.quantity);
      productStats[productName].totalValue += parseFloat(item.total_return_value);
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average age at return (use filtered items)
    let totalAge = 0;
    let ageCount = 0;
    filteredItems.forEach(item => {
      if (item.age_at_return !== null && item.age_at_return !== undefined) {
        totalAge += parseInt(item.age_at_return);
        ageCount += 1;
      }
    });

    const averageAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : 0;

    return {
      totalValue,
      averageValue: totalValue / returns.length,
      totalReturns: returns.length,
      trends,
      products: topProducts,
      averageAge: parseFloat(averageAge)
    };
  };

  const handleUndoReturn = async () => {
    if (!selectedReturn || !selectedReturn.return) return;

    setUndoing(true);
    try {
      const result = await undoReturn(supabaseClient, selectedReturn.return.id);

      if (result.error) {
        throw new Error(result.error);
      }

      alert(`✅ Return undone successfully! ${result.batchesRecreated} batches restored to inventory.`);
      
      // Refresh the list
      await loadReturns();
      setShowUndoConfirm(false);
      setSelectedReturn(null);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error undoing return:', error);
      alert(`❌ Error undoing return: ${error.message}`);
    } finally {
      setUndoing(false);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content with all return items
    const headers = [
      'Return Date',
      'Return Time',
      'Processed By',
      'Product Name',
      'Quantity',
      'Age (Days)',
      'Original Price',
      'Sale Price',
      'Return %',
      'Return Value per Unit',
      'Total Return Value'
    ];

    // Map return items to CSV rows with return metadata
    const rows = returnItems.map(item => {
      const returnRecord = returns.find(r => r.id === item.return_id);
      const processedBy = returnRecord?.users 
        ? `${returnRecord.users.first_name} ${returnRecord.users.last_name}`
        : 'Unknown';
      
      return [
        new Date(returnRecord?.return_date || '').toLocaleDateString(),
        returnRecord?.processed_at ? new Date(returnRecord.processed_at).toLocaleTimeString() : '',
        processedBy,
        item.product_name || 'Unknown',
        item.quantity,
        item.age_at_return,
        parseFloat(item.original_price).toFixed(2),
        parseFloat(item.sale_price).toFixed(2),
        item.return_percentage,
        parseFloat(item.return_value_per_unit).toFixed(2),
        parseFloat(item.total_return_value).toFixed(2)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with date range
    const dateStr = dateRange.start || dateRange.end 
      ? `${dateRange.start || 'all'}_to_${dateRange.end || 'all'}`
      : 'all_returns';
    link.setAttribute('download', `returns_export_${dateStr}_${new Date().toISOString().split('T')[0]}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✅ CSV export started successfully!');
  };

  const handleExportPDF = () => {
    // Create a printable HTML window (print to PDF)
    const printWindow = window.open('', '_blank');
    
    const dateStr = dateRange.start || dateRange.end 
      ? `${dateRange.start || 'all'} to ${dateRange.end || 'all'}`
      : 'All Returns';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Returns Report - ${dateStr}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            .summary {
              display: flex;
              justify-content: space-around;
              margin-bottom: 30px;
              padding: 20px;
              background-color: #eff6ff;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-item-value {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            td {
              border: 1px solid #ddd;
              padding: 10px;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Returns Report</h1>
            <p>Date Range: ${dateStr}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-item-label">Total Returns</div>
              <div class="summary-item-value">${analytics.totalReturns}</div>
            </div>
            <div class="summary-item">
              <div class="summary-item-label">Total Value</div>
              <div class="summary-item-value">Rs. ${analytics.totalValue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-item-label">Avg per Return</div>
              <div class="summary-item-value">Rs. ${analytics.averageValue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-item-label">Avg Age</div>
              <div class="summary-item-value">${analytics.averageAge} days</div>
            </div>
          </div>

          <h2>Return Details</h2>
          <table>
            <thead>
              <tr>
                <th>Return Date</th>
                <th>Return Time</th>
                <th>Processed By</th>
                <th>Product Name</th>
                <th class="text-center">Quantity</th>
                <th class="text-center">Age (Days)</th>
                <th class="text-right">Original Price</th>
                <th class="text-right">Sale Price</th>
                <th class="text-center">Return %</th>
                <th class="text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              ${returnItems.map(item => {
                const returnRecord = returns.find(r => r.id === item.return_id);
                const processedBy = returnRecord?.users 
                  ? `${returnRecord.users.first_name} ${returnRecord.users.last_name}`
                  : 'Unknown';
                
                return `
                  <tr>
                    <td>${new Date(returnRecord?.return_date || '').toLocaleDateString()}</td>
                    <td>${returnRecord?.processed_at ? new Date(returnRecord.processed_at).toLocaleTimeString() : ''}</td>
                    <td>${processedBy}</td>
                    <td>${item.product_name || 'Unknown'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-center">${item.age_at_return}</td>
                    <td class="text-right">Rs. ${parseFloat(item.original_price).toFixed(2)}</td>
                    <td class="text-right">Rs. ${parseFloat(item.sale_price).toFixed(2)}</td>
                    <td class="text-center">${item.return_percentage}%</td>
                    <td class="text-right">Rs. ${parseFloat(item.total_return_value).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Ayubo Cafe - Returns Management System</p>
            <p>This is an automated report generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const analytics = calculateAnalytics();
  const groupedByDate = getReturnsGroupedByDate();

  // Pagination logic
  const totalPages = Math.ceil(groupedByDate.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDates = groupedByDate.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Scroll to top of sidebar
    const sidebar = document.querySelector('.overflow-y-auto');
    if (sidebar) {
      sidebar.scrollTop = 0;
    }
  };

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
          <div className="grid grid-cols-4 gap-4 mb-4">
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
              <div className="text-sm text-gray-600">Avg per Return</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-700">{analytics.averageAge}</div>
              <div className="text-sm text-gray-600">Avg Age (Days)</div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-blue-200">
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              placeholder="Start date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              placeholder="End date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
            <button
              onClick={() => setDateRange({ start: null, end: null })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
              disabled={!dateRange.start && !dateRange.end}
            >
              Clear Date Filter
            </button>
          </div>

          {/* Product Name & Value Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-blue-200">
            <input
              type="text"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              placeholder="Filter by product name..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
            <input
              type="number"
              value={valueRangeFilter.min}
              onChange={(e) => setValueRangeFilter({ ...valueRangeFilter, min: e.target.value })}
              placeholder="Min value (Rs.)"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={valueRangeFilter.max}
                onChange={(e) => setValueRangeFilter({ ...valueRangeFilter, max: e.target.value })}
                placeholder="Max value (Rs.)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                onClick={() => {
                  setProductFilter('');
                  setValueRangeFilter({ min: '', max: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
                disabled={!productFilter && !valueRangeFilter.min && !valueRangeFilter.max}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Show Archived Toggle */}
          <div className="pt-3 border-t border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                📦 Show archived returns (older than 30 days)
              </span>
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 History
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'trends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📈 Trends
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 Products
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Date List Sidebar - Only show for history tab */}
          {activeTab === 'history' && (
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
              <h3 className="font-bold text-gray-900 mb-4">Return Dates</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : groupedByDate.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No returns found</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {paginatedDates.map((dateData) => (
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        Page {currentPage} of {totalPages} ({groupedByDate.length} total)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ‹ Prev
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next ›
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          )}

          {/* Content Based on Active Tab */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'history' && (
              <>
                {selectedReturn && selectedReturn.return ? (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {new Date(selectedReturn.return.processed_at).toLocaleString()}
                        </h3>
                        <button
                          onClick={() => setShowUndoConfirm(true)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors text-sm flex items-center gap-2"
                        >
                          <span>🗑️</span>
                          <span>Undo Return</span>
                        </button>
                      </div>
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
              </>
            )}

            {activeTab === 'trends' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Return Value Trends</h3>
                {analytics.trends.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No trend data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold">Returns</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Total Value</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.trends.map((trend, idx) => {
                          const maxValue = Math.max(...analytics.trends.map(t => t.value));
                          const barWidth = maxValue > 0 ? (trend.value / maxValue * 100) : 0;
                          return (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="py-3 px-4 font-medium">{new Date(trend.date).toLocaleDateString()}</td>
                              <td className="py-3 px-4 text-center">{trend.count}</td>
                              <td className="py-3 px-4 text-right font-semibold">Rs. {trend.value.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                                    <div 
                                      className="bg-blue-600 h-6 rounded-full transition-all"
                                      style={{ width: `${barWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500 w-12 text-right">{barWidth.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Most Frequently Returned Products</h3>
                {analytics.products.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No product data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Product</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold">Times Returned</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold">Total Quantity</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Total Value</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold">Visual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.products.map((product, idx) => {
                          const maxCount = Math.max(...analytics.products.map(p => p.count));
                          const barWidth = maxCount > 0 ? (product.count / maxCount * 100) : 0;
                          return (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="py-3 px-4 font-medium">{product.name}</td>
                              <td className="py-3 px-4 text-center font-semibold">{product.count}</td>
                              <td className="py-3 px-4 text-center">{product.totalQuantity.toFixed(1)}</td>
                              <td className="py-3 px-4 text-right font-semibold text-green-700">
                                Rs. {product.totalValue.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-6">
                                    <div 
                                      className="bg-green-600 h-6 rounded-full transition-all"
                                      style={{ width: `${barWidth}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={returnItems.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={returnItems.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📄</span>
              <span>Print PDF</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Undo Confirmation Dialog */}
        {showUndoConfirm && selectedReturn && selectedReturn.return && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">⚠️ Undo Return?</h3>
                
                <div className="mb-6 space-y-3">
                  <p className="text-gray-700">
                    You are about to undo this return and restore batches to inventory:
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-sm font-semibold text-red-900 mb-2">Return Details:</div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <div><span className="font-medium">Date:</span> {new Date(selectedReturn.return.processed_at).toLocaleString()}</div>
                      <div><span className="font-medium">Value:</span> Rs. {parseFloat(selectedReturn.return.total_value).toFixed(2)}</div>
                      <div><span className="font-medium">Batches:</span> {selectedReturn.return.total_batches}</div>
                      <div><span className="font-medium">Quantity:</span> {selectedReturn.return.total_quantity}</div>
                    </div>
                  </div>
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ This will recreate batches and restore inventory. This action cannot be easily undone.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUndoConfirm(false)}
                    disabled={undoing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUndoReturn}
                    disabled={undoing}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {undoing && <Loader className="w-4 h-4 animate-spin" />}
                    {undoing ? 'Undoing...' : 'Confirm Undo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnedLog;

