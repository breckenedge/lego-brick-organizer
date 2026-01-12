/**
 * Simple client-side router using History API
 * Supports route patterns with parameters (e.g., /bins/:binId)
 */
export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
  }

  /**
   * Add a route definition
   * @param {string} pattern - Route pattern (e.g., '/bins/:binId')
   * @param {function} handler - Handler function to call when route matches
   */
  addRoute(pattern, handler) {
    this.routes.push({
      pattern: this.patternToRegex(pattern),
      handler,
      originalPattern: pattern
    });
  }

  /**
   * Convert route pattern to regex with parameter extraction
   * @param {string} pattern - Route pattern (e.g., '/bins/:binId')
   * @returns {object} Regex and parameter names
   */
  patternToRegex(pattern) {
    const paramNames = [];

    // Escape special regex characters and replace :param with capture groups
    const regexPattern = pattern
      .replace(/:[^/]+/g, (match) => {
        paramNames.push(match.slice(1)); // Remove the : prefix
        return '([^/]+)'; // Match any characters except /
      })
      .replace(/\//g, '\\/'); // Escape forward slashes

    return {
      regex: new RegExp(`^${regexPattern}$`),
      paramNames
    };
  }

  /**
   * Extract parameters from URL based on pattern
   * @param {object} pattern - Pattern object with regex and paramNames
   * @param {string} path - URL path to match
   * @returns {object|null} Extracted parameters or null if no match
   */
  extractParams(pattern, path) {
    const match = path.match(pattern.regex);
    if (!match) return null;

    const params = {};
    pattern.paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    return params;
  }

  /**
   * Handle route change by finding and calling matching handler
   */
  handleRoute() {
    const path = window.location.pathname;

    // Try to match against all registered routes
    for (const route of this.routes) {
      const params = this.extractParams(route.pattern, path);
      if (params !== null) {
        this.currentRoute = path;
        route.handler(params);
        return;
      }
    }

    // No route matched - navigate to default route
    console.warn(`No route matched for ${path}, redirecting to /search`);
    this.navigate('/search', { replace: true });
  }

  /**
   * Programmatic navigation
   * @param {string} path - Path to navigate to
   * @param {object} options - Navigation options
   * @param {boolean} options.replace - Use replaceState instead of pushState
   */
  navigate(path, options = {}) {
    if (options.replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
    this.handleRoute();
  }

  /**
   * Initialize router - set up event listeners and handle initial route
   */
  init() {
    // Listen for browser back/forward button
    window.addEventListener('popstate', () => this.handleRoute());

    // Handle the current route on initialization
    this.handleRoute();
  }
}
