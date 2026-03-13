import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: "#0f0f1a", color: "#fff", minHeight: "100vh", fontFamily: "monospace" }}>
          <h1 style={{ color: "#ef4444", fontSize: 24 }}>Something went wrong</h1>
          <pre style={{ color: "#f97316", whiteSpace: "pre-wrap", marginTop: 16 }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ color: "#64748b", whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12 }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: "10px 20px", background: "#0098EA", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
