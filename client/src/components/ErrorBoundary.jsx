import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Application section failed to render:', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="container-narrow app-error-boundary" role="alert" aria-live="assertive">
          <div className="card">
            <h2>Something went wrong</h2>
            <p>We couldn’t display this section. You can retry or return to the home page.</p>
            <div className="app-error-actions">
              <button type="button" className="btn btn-primary" onClick={this.handleRetry}>Try again</button>
              <a className="btn btn-secondary" href="/">Go to home</a>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
