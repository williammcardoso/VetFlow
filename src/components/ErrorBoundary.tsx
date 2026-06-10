import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", maxWidth: 600, margin: "80px auto" }}>
          <h1 style={{ fontSize: 24, marginBottom: 12, color: "#b91c1c" }}>
            Ocorreu um erro inesperado
          </h1>
          <p style={{ color: "#374151", marginBottom: 16, lineHeight: 1.6 }}>
            A aplicação encontrou um problema e não pôde renderizar esta página.
          </p>
          <pre
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: 16,
              fontSize: 13,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#991b1b",
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
