"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  // Provide either a static fallback node or a render prop for full control
  fallback?: React.ReactNode;
  fallbackRender?: (args: { error: Error | null; reset: () => void }) => React.ReactNode;
  // Called when an error is caught
  onError?: (error: Error, info: React.ErrorInfo) => void;
  // Called when the boundary is reset (via Retry or resetKeys change)
  onReset?: () => void;
  // When any value here changes, the boundary resets automatically
  resetKeys?: Array<unknown>;
  // Force a child remount on reset (helps clear nested component state)
  remountOnReset?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  remountKey: number;
}

function shallowArrayEqual(a?: readonly unknown[], b?: readonly unknown[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  state: ErrorBoundaryState = { hasError: false, error: null, remountKey: 0 };

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: Readonly<ErrorBoundaryProps>): void {
    // Auto-reset when resetKeys change
    if (!shallowArrayEqual(this.props.resetKeys, prevProps.resetKeys) && this.state.hasError) {
      this.reset();
    }
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState((s) => ({ hasError: false, error: null, remountKey: this.props.remountOnReset === false ? s.remountKey : s.remountKey + 1 }));
  };

  private renderDefaultFallback(error: Error | null) {
    const message = error?.message || 'Something went wrong.';
    return (
      <div className="rounded-lg border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{this.props.title || 'Error loading YouTube content'}</div>
            <div className="mt-1 text-sm text-muted-foreground">{message}</div>
          </div>
          <Button onClick={this.reset}>Retry</Button>
        </div>
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
            {error.stack}
          </pre>
        )}
      </div>
    );
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({ error: this.state.error, reset: this.reset });
      }
      if (this.props.fallback) {
        return (
          <div className="space-y-3">
            {this.props.fallback}
            <div>
              <Button onClick={this.reset}>Retry</Button>
            </div>
          </div>
        );
      }
      return this.renderDefaultFallback(this.state.error);
    }

    // Optionally remount children after a reset to clear nested state
    const key = this.state.remountKey;
    return <React.Fragment key={key}>{this.props.children}</React.Fragment>;
  }
}

// Convenience wrapper component
export default function YouTubeErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundary {...props} />;
}
