// Theme Management System
class ThemeManager {
  constructor() {
    this.storageKey = "ifemade-theme";
    this.toggle = null;
    this.currentTheme = this.getStoredTheme() || this.getSystemPreference();

    this.init();
  }

  init() {
    // Apply theme on page load
    this.applyTheme(this.currentTheme);

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupToggle());
    } else {
      this.setupToggle();
    }
  }

  setupToggle() {
    this.toggle = document.getElementById("theme-toggle");
    if (!this.toggle) {
      console.warn("Theme toggle element not found");
      return;
    }

    // Set initial state
    this.toggle.checked = this.currentTheme === "dark";

    // Add event listener
    this.toggle.addEventListener("change", (e) => {
      this.toggleTheme();
    });
  }

  getSystemPreference() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  getStoredTheme() {
    try {
      return localStorage.getItem(this.storageKey);
    } catch (e) {
      console.warn("LocalStorage not available, using system preference");
      return null;
    }
  }

  storeTheme(theme) {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (e) {
      console.warn("Unable to store theme preference");
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);

    // Update toggle state if it exists
    if (this.toggle) {
      this.toggle.checked = theme === "dark";
    }

    // Store preference
    this.storeTheme(theme);

    // Dispatch custom event for other components
    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: theme },
      })
    );
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme(newTheme);
  }

  // Public API
  setTheme(theme) {
    if (theme === "light" || theme === "dark") {
      this.applyTheme(theme);
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Listen for system theme changes
if (window.matchMedia) {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      // Only update if user hasn't set a preference
      if (!themeManager.getStoredTheme()) {
        themeManager.applyTheme(e.matches ? "dark" : "light");
      }
    });
}

// Export for global access
window.themeManager = themeManager;
