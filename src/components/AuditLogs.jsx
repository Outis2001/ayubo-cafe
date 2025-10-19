/**
 * Audit Logs Viewer Component
 * 
 * Displays a comprehensive view of all audit log entries for security and compliance.
 * Owner-only feature with filtering, pagination, and export capabilities.
 * 
 * @component
 */

import { useState, useEffect, Fragment } from 'react';
import { supabaseClient } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader, X } from './icons';

const LOGS_PER_PAGE = 50;

// Action labels for display
const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  failed_login: 'Failed Login',
  password_change: 'Password Change',
  password_reset_requested: 'Password Reset Requested',
  password_reset_completed: 'Password Reset Completed',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
  user_activated: 'User Activated',
  session_expired: 'Session Expired',
};

const AuditLogs = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [expandedLog, setExpandedLog] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    username: '',
    action: '',
    status: '',
  });

  /**
   * Check if current user is owner
   */
  const isOwner = currentUser?.role === 'owner';

  /**
   * Fetch audit logs from the database
   */
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      // Build query
      let query = supabaseClient
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('timestamp', new Date(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        query = query.lte('timestamp', dateTo.toISOString());
      }
      if (filters.username) {
        query = query.ilike('username_attempted', `%${filters.username}%`);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination and ordering
      const offset = (page - 1) * LOGS_PER_PAGE;
      query = query
        .order('timestamp', { ascending: false })
        .range(offset, offset + LOGS_PER_PAGE - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Error fetching audit logs:', fetchError);
        setError('Failed to load audit logs. Please try again.');
        return;
      }

      setLogs(data || []);
      setTotalLogs(count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Unexpected error fetching audit logs:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchLogs(1);
    }
  }, [isOwner, filters]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Handle page navigation
   */
  const handlePageChange = (newPage) => {
    fetchLogs(newPage);
  };

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      username: '',
      action: '',
      status: '',
    });
    setCurrentPage(1);
  };

  /**
   * Export logs to CSV
   */
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No logs to export.');
      return;
    }

    // Prepare CSV content
    const headers = ['Timestamp', 'Username', 'Action', 'Status', 'IP Address', 'User Agent', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.username_attempted || 'N/A',
      ACTION_LABELS[log.action] || log.action,
      log.status,
      log.ip_address || 'N/A',
      log.user_agent || 'N/A',
      JSON.stringify(log.details || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString()}.csv`;
    link.click();
  };

  /**
   * Toggle expanded log details
   */
  const toggleLogDetails = (logId) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    return status === 'success' 
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-red-100 text-red-700 border-red-300';
  };

  /**
   * Get action badge color
   */
  const getActionColor = (action) => {
    const dangerActions = ['failed_login', 'user_deactivated', 'session_expired', 'password_reset_requested'];
    const warningActions = ['password_change', 'password_reset_completed', 'user_updated'];
    
    if (dangerActions.includes(action)) {
      return 'bg-red-100 text-red-700';
    } else if (warningActions.includes(action)) {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-blue-100 text-blue-700';
  };

  // If not owner, show access denied
  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader size={48} />
      </div>
    );
  }

  const totalPages = Math.ceil(totalLogs / LOGS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">Audit Logs</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Security and compliance event tracking</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition text-sm sm:text-base disabled:opacity-50"
              disabled={logs.length === 0}
            >
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="Search username"
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-stretch sm:justify-end">
            <button
              onClick={handleResetFilters}
              className="w-full sm:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Timestamp</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Username</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Action</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Status</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm hidden md:table-cell">IP Address</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs sm:text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <Fragment key={log.audit_id}>
                    <tr className="border-t hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium">
                        {log.username_attempted || <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getActionColor(log.action)}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${getStatusColor(log.status)}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                        {log.ip_address || <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
                        <button
                          onClick={() => toggleLogDetails(log.audit_id)}
                          className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium"
                        >
                          {expandedLog === log.audit_id ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log.audit_id && (
                      <tr className="bg-gray-50 border-t">
                        <td colSpan="6" className="px-2 sm:px-4 py-4">
                          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-blue-200">
                            <h3 className="text-sm font-bold text-blue-700 mb-2">Detailed Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                              <div>
                                <p className="font-semibold text-gray-700">Audit ID:</p>
                                <p className="text-gray-600 font-mono text-xs break-all">{log.audit_id}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-700">User ID:</p>
                                <p className="text-gray-600 font-mono text-xs break-all">{log.user_id || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-700">User Agent:</p>
                                <p className="text-gray-600 text-xs break-all">{log.user_agent || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-700">Details:</p>
                                <pre className="text-gray-600 text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-gray-600 text-xs sm:text-sm text-center sm:text-left">
              Showing {((currentPage - 1) * LOGS_PER_PAGE) + 1} to {Math.min(currentPage * LOGS_PER_PAGE, totalLogs)} of {totalLogs} logs
            </div>
            <div className="flex gap-2 items-center flex-wrap justify-center">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg font-bold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Previous
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg font-bold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-gray-600 text-sm">
          Total Audit Events: <strong>{totalLogs}</strong>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;

