import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in NextOS:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
          <div className="card p-8 max-w-md text-center">
            <h1 className="text-lg font-bold text-ink-900 dark:text-ink-50 mb-2">Something went wrong</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400 mb-6">
              NextOS hit an unexpected error. Reloading usually fixes it.
            </p>
            <button className="btn-primary justify-center" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
