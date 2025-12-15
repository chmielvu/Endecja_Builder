import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="fixed inset-0 bg-red-100 flex items-center justify-center p-8 z-50 font-sans text-red-800">
          <div className="bg-white border-2 border-red-500 p-8 rounded-lg shadow-xl text-center max-w-lg">
            <h1 className="text-3xl font-bold mb-4">Oops! Something went wrong.</h1>
            <p className="text-lg mb-6">We encountered an unexpected error. Please try reloading the application.</p>
            {this.state.error && (
              <details className="text-left bg-red-50 p-4 rounded-md border border-red-200 mt-4">
                <summary className="font-semibold cursor-pointer">Error Details</summary>
                <p className="mt-2 text-sm">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-xs overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                    <code>{this.state.errorInfo.componentStack}</code>
                  </pre>
                )}
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}