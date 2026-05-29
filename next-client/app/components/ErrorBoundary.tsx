"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Button from "./Button";
import { HiOutlineRefresh, HiOutlineHome } from "react-icons/hi";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-mono lowercase tracking-tighter text-neutral-900 dark:text-neutral-100">
                something went wrong
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                An unexpected error occurred in the editor.
              </p>
            </div>
            
            {this.state.error && (
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg text-left overflow-auto max-h-40 border border-neutral-200 dark:border-neutral-800">
                <code className="text-[10px] text-red-500 dark:text-red-400 break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="primary" onClick={this.handleReset} className="w-full sm:w-auto">
                <HiOutlineRefresh size={18} />
                <span>Reload Editor</span>
              </Button>
              <Button variant="outlined" onClick={this.handleGoHome} className="w-full sm:w-auto">
                <HiOutlineHome size={18} />
                <span>Go Home</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
