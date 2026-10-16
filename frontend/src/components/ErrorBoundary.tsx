import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-card border border-destructive/30 rounded-xl shadow-lg text-foreground">
          <div className="flex items-center gap-3 text-destructive mb-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-xl font-bold">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            An unexpected error occurred while rendering this view.
          </p>
          {this.state.error?.message && (
            <div className="p-3 mb-6 bg-destructive/10 rounded-lg text-xs font-mono text-destructive overflow-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary text-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
