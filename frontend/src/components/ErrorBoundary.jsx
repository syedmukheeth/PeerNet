import { Component } from 'react'

/*
 * There was no error boundary anywhere in the app, so any render throw
 * unmounted the entire tree and left a blank white page with no way back
 * except a manual reload. main.jsx only handled chunk-load failures.
 *
 * Two levels are used: one around the whole route tree in App.jsx, and one
 * inside Layout around the page outlet so a single broken page keeps the
 * shell, the navigation and the socket connection alive.
 *
 * Class component because there is still no hook equivalent of
 * componentDidCatch.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { error: null }
    }

    static getDerivedStateFromError(error) {
        return { error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info?.componentStack)
    }

    componentDidUpdate(prevProps) {
        // Reset when the caller changes resetKey, which Layout sets to the
        // current pathname. Without this a page that threw once stays broken
        // for the rest of the session even after navigating away.
        if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null })
        }
    }

    render() {
        if (!this.state.error) return this.props.children

        if (this.props.fallback) {
            return this.props.fallback(this.state.error, () => this.setState({ error: null }))
        }

        return (
            <div className="error-boundary" role="alert">
                <h2 className="error-boundary-title">Something went wrong</h2>
                <p className="error-boundary-body">
                    This part of PeerNet failed to load. You can try again, and the rest of the
                    app should still work.
                </p>
                {import.meta.env.DEV && (
                    <pre className="error-boundary-detail">{String(this.state.error)}</pre>
                )}
                <div className="error-boundary-actions">
                    <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
                        Try again
                    </button>
                    <button className="btn btn-ghost" onClick={() => window.location.assign('/')}>
                        Go home
                    </button>
                </div>
            </div>
        )
    }
}
