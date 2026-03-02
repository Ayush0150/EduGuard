/**
 * =====================================================
 * Error Boundary Component
 * =====================================================
 *
 * Catches JavaScript errors in child components and
 * displays a fallback UI instead of crashing.
 */

import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to external service in production
    if (import.meta.env.PROD) {
      console.error("Error Boundary caught:", error, errorInfo);
      // TODO: Send to error tracking service (Sentry, etc.)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-50 p-4 dark:bg-surface-950">
          <div className="w-full max-w-md animate-scale-in text-center">
            {/* Error Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 animate-fade-in-down items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="mb-2 text-2xl font-bold text-surface-900 dark:text-white">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="mb-6 text-surface-500 dark:text-surface-400">
              We encountered an unexpected error. Please try again or contact
              support if the problem persists.
            </p>

            {/* Actions */}
            <div
              className="flex flex-col gap-3 animate-fade-in-up sm:flex-row sm:justify-center"
              style={{ animationDelay: "200ms", animationFillMode: "both" }}
            >
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/25 press-scale"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try again
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-6 py-3 text-sm font-semibold text-surface-700 transition-all duration-200 hover:bg-surface-50 hover:shadow-sm press-scale dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              >
                Go home
              </button>
            </div>

            {/* Error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-8 animate-fade-in rounded-xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/50 dark:bg-red-950/30">
                <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-400">
                  Error details (development only)
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-red-600 dark:text-red-300">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
