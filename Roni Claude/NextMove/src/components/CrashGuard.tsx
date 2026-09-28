import { Component, type ReactNode } from 'react'

/**
 * Last line of defence: an error while drawing a screen shows a way out instead of a blank page
 * (QA I). App keys it by route, so moving to another screen clears it.
 */
export default class CrashGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('NextMove screen error:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash" role="alert">
        <h1 className="screen-title">Oops, this screen got stuck</h1>
        <p>Something went wrong while opening it. Your games and progress are still saved.</p>
        <div className="crash-actions">
          <button className="btn btn-primary" onClick={() => (location.hash = '/')}>
            Back to home
          </button>
          <button className="btn" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
