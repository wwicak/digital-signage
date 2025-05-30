import App, { AppContext, AppProps } from 'next/app';
import React from 'react';

// Import global styles
import '../styles/GridLayoutStyles.css';
import 'react-resizable/css/styles.css';
import '@fortawesome/fontawesome-svg-core/styles.css'; // Prevent Font Awesome from adding its own CSS automatically

// If react-easy-state's view HOC were used here, or a global Provider,
// it would be initialized or wrapped here.
// For example, if `view` was required for all pages:
// import { view } from 'react-easy-state';

// No custom props are added to the App component itself in this case,
// page-specific props are handled by pageProps.
// interface MyCustomAppProps { /* ... any custom props for _app ... */ }
// class NextApp extends App<AppProps & MyCustomAppProps> { ... }
// For now, just AppProps is sufficient.

class NextApp extends App {
  // getInitialProps is defined on the App component itself
  static async getInitialProps({ Component, ctx }: AppContext): Promise<{ pageProps: any }> {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  render() {
    const { Component, pageProps } = this.props;
    // The <Container> component is deprecated.
    // You can return the Component directly.
    // If you need to wrap it, use a React.Fragment or a div.
    return <Component {...pageProps} />;
  }
}

// If using view from react-easy-state globally (though not in original _app.js):
// export default view(NextApp);
export default NextApp;
