import { useState, useEffect } from 'react';

/**
 * Custom Hook: useStockCheckIn
 * Manages daily stock check-in state using localStorage
 * Detects if user needs to perform daily stock check-in
 * 
 * @param {string} userRole - Current user role (guest/cashier/owner)
 * @returns {Object} Check-in state and control functions
 */
const useStockCheckIn = (userRole) => {
  const [shouldShowCheckIn, setShouldShowCheckIn] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState(null);

  // Check if check-in is needed on mount or when user role changes
  useEffect(() => {
    // Don't show check-in for guests or if no user is logged in
    if (!userRole || userRole === 'guest') {
      setShouldShowCheckIn(false);
      return;
    }

    checkIfCheckInNeeded();
  }, [userRole]);

  /**
   * Check if daily check-in is needed
   * Compares stored date with today's date
   */
  const checkIfCheckInNeeded = () => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('lastStockCheckIn');
    
    setLastCheckInDate(storedDate);

    // If no check-in today, show modal
    if (storedDate !== today) {
      setShouldShowCheckIn(true);
    } else {
      setShouldShowCheckIn(false);
    }
  };

  /**
   * Mark check-in as completed for today
   * Stores current date in localStorage
   */
  const completeCheckIn = () => {
    const today = new Date().toDateString();
    localStorage.setItem('lastStockCheckIn', today);
    setLastCheckInDate(today);
    setShouldShowCheckIn(false);
  };

  /**
   * Skip check-in for today
   * Same as completing - marks it as done
   */
  const skipCheckIn = () => {
    completeCheckIn(); // Treat skip same as complete
  };

  /**
   * Manually trigger check-in modal
   * Used for manual stock updates via button click
   */
  const showCheckInManually = () => {
    setShouldShowCheckIn(true);
  };

  /**
   * Force reset check-in state
   * Useful for testing or admin override
   */
  const resetCheckIn = () => {
    localStorage.removeItem('lastStockCheckIn');
    setLastCheckInDate(null);
    setShouldShowCheckIn(true);
  };

  return {
    shouldShowCheckIn,
    lastCheckInDate,
    completeCheckIn,
    skipCheckIn,
    showCheckInManually,
    resetCheckIn
  };
};

export default useStockCheckIn;

