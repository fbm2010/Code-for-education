import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-parchment px-6">
          <div className="text-5xl mb-4">🧭</div>
          <h1 className="text-2xl font-black text-earth-800 mb-2">Trail Error</h1>
          <p className="text-earth-500 text-sm mb-6 text-center max-w-sm">
            Something went wrong on this part of the expedition.
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
          >
            Return to Base Camp
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 max-w-lg overflow-auto">
              {this.state.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
