import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PopButton } from '../ui/InteractivePrimitives';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Prayana ErrorBoundary Caught Error]:', error, errorInfo);
  }

  // Auto-reset the error boundary when children change (e.g. Canvas gets new key).
  // This prevents the stale fallback UI persisting after a forced remount.
  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState(prev => ({ hasError: false, error: null, errorKey: prev.errorKey + 1 }));
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center p-6 bg-[#121212] border border-[rgba(242,240,235,0.14)] text-center font-mono select-none">
          <div className="w-8 h-8 rounded-full bg-[#201515] border border-semantic-hazard flex items-center justify-center mb-3 text-semantic-hazard">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-[9px] text-ink-muted uppercase tracking-widest mb-1">
            [ACCELERATOR SUSPENDED // ARCHITECTURAL RECOVERY]
          </div>
          <h3 className="font-serif text-2xl text-ink-primary mb-2">
            {this.props.fallbackTitle || '3D Hardware Stage'}
          </h3>
          <p className="text-[10px] text-ink-secondary max-w-sm mb-4 leading-relaxed font-sans">
            The graphics pipeline was suspended during cross-view navigation or WebGL context reset. Core itinerary and traveler state are safely preserved.
          </p>
          <PopButton
            size="sm"
            onClick={this.handleReset}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RE-INITIALIZE 3D STAGE ↺</span>
          </PopButton>
        </div>
      );
    }

    return this.props.children;
  }
}
