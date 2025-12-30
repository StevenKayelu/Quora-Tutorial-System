import { useEffect } from "react";

/**
 * useIdleTimeout Hook
 * 
 * This hook monitors user activity (mouse movement, keyboard input,
 * clicks, and scrolling). If the user is inactive for the specified 
 * amount of time (default: 5 minutes), the provided logout callback 
 * is triggered.
 * 
 * @param {Function} onLogout - Function to execute when idle timeout occurs
 * @param {number} idleTime - Time in ms before logout (default 5 min)
 */
export const useIdleTimeout = (onLogout, idleTime = 5 * 60 * 1000) => {
  useEffect(() => {
    let inactivityTimer;

    // Save current timestamp on user interaction
    const resetTimer = () => {
      localStorage.setItem("lastActivity", Date.now());
    };

    // Check if user has been inactive for longer than allowed time
    const checkInactivity = () => {
      const lastActivity = localStorage.getItem("lastActivity");
      if (lastActivity && Date.now() - Number(lastActivity) >= idleTime) {
        onLogout();
      }
    };

    // Register user activity listeners
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    // Initialize timer
    resetTimer();

    // Check inactivity every minute
    inactivityTimer = setInterval(checkInactivity, 60 * 1000);

    return () => {
      clearInterval(inactivityTimer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [onLogout, idleTime]);
};
