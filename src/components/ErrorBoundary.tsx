import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
        readable = `Cloud sync error (${parsed.operationType ?? 'operation'}): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, errorMessage: readable };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0B14] px-4 py-12 text-[#F3F0FA]">
        <div className="w-full max-w-md rounded-xl border border-[#4C1D24] bg-[#151221] p-6 space-y-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#F87171] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h1 className="sw-title text-sm font-bold text-[#F3F0FA]">
                SYNCHRONIZATION INTERRUPTED
              </h1>
              <p className="mt-1.5 text-xs text-[#C4A6AD] leading-relaxed">
                {this.state.errorMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#352D52] bg-[#1C182C] px-3.5 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="saber-purple-btn rounded-lg bg-[#9333EA] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }
}
