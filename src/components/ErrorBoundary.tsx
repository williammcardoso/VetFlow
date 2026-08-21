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
        <div className="max-w-[600px] mx-auto my-20 p-10 bg-background text-foreground">
          <h1 className="text-2xl font-semibold mb-3 text-destructive">
            Ocorreu um erro inesperado
          </h1>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            A aplicação encontrou um problema e não pôde renderizar esta página.
          </p>
          <pre className="bg-destructive/10 border border-destructive/40 rounded-lg p-4 text-[13px] overflow-auto whitespace-pre-wrap break-words text-destructive">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 px-5 py-2.5 bg-primary text-primary-foreground border-none rounded-lg cursor-pointer text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
