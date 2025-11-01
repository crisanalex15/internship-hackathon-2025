// Session Logger - Track user activities and sessions
class SessionLogger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.isEnabled = true;
  }

  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Log authentication events
  logAuthEvent(event, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event: `auth_${event}`,
      details: {
        ...details,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      },
    };

    this.events.push(logEntry);
    this.saveToStorage();
    // console.log("[SessionLogger] Auth Event:", logEntry); // Disabled for production
  }

  // Log user actions
  logUserAction(action, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event: `user_${action}`,
      details: {
        ...details,
        url: window.location.href,
      },
    };

    this.events.push(logEntry);
    this.saveToStorage();
    // console.log("[SessionLogger] User Action:", logEntry); // Disabled for production
  }

  // Log page visits
  logPageVisit(page, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event: "page_visit",
      details: {
        page,
        ...details,
        url: window.location.href,
        referrer: document.referrer,
      },
    };

    this.events.push(logEntry);
    this.saveToStorage();
    // console.log("[SessionLogger] Page Visit:", logEntry); // Disabled for production
  }

  // Log errors
  logError(error, context = "") {
    if (!this.isEnabled) return;

    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      event: "error",
      details: {
        error: error.message || error,
        context,
        stack: error.stack,
        url: window.location.href,
      },
    };

    this.events.push(logEntry);
    this.saveToStorage();
    // Keep error logging for debugging
    console.error("[SessionLogger] Error:", logEntry);
  }

  // Start session
  startSession(userInfo = null) {
    this.logAuthEvent("session_start", {
      userInfo,
      sessionDuration: 0,
    });
  }

  // End session
  endSession(reason = "logout") {
    const duration = Date.now() - this.startTime;
    this.logAuthEvent("session_end", {
      reason,
      sessionDuration: duration,
      totalEvents: this.events.length,
    });
  }

  // Get session summary
  getSessionSummary() {
    const duration = Date.now() - this.startTime;
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration,
      totalEvents: this.events.length,
      events: this.events,
    };
  }

  // Save to localStorage
  saveToStorage() {
    try {
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.startTime,
        events: this.events.slice(-50), // Keep last 50 events
      };
      localStorage.setItem("session_log", JSON.stringify(sessionData));
    } catch (error) {
      console.error("Failed to save session log:", error);
    }
  }

  // Load from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem("session_log");
      if (stored) {
        const data = JSON.parse(stored);
        this.sessionId = data.sessionId || this.sessionId;
        this.startTime = data.startTime || this.startTime;
        this.events = data.events || [];
      }
    } catch (error) {
      console.error("Failed to load session log:", error);
    }
  }

  // Clear session data
  clearSession() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    localStorage.removeItem("session_log");
  }

  // Export session data
  exportSessionData() {
    return {
      summary: this.getSessionSummary(),
      events: this.events,
    };
  }

  // Disable/Enable logging
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
const sessionLogger = new SessionLogger();

// Load existing session on startup
sessionLogger.loadFromStorage();

// Auto-save session on page unload
window.addEventListener("beforeunload", () => {
  sessionLogger.endSession("page_unload");
});

export default sessionLogger;
