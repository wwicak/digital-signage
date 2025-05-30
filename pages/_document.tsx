import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import flush from 'styled-jsx/server';
import React from 'react';

interface IAppDocumentProps extends DocumentInitialProps {
  styleTags?: React.ReactElement[]; // From styled-components
  styles?: React.ReactElement[]; // From styled-jsx
}

class AppDocument extends Document<IAppDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<IAppDocumentProps> {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      const styledJsxStyles = flush(); // Get styled-jsx styles

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {styledJsxStyles}
          </>
        ),
        styleTags: sheet.getStyleElement(), // styled-components styles
      };
    } finally {
      sheet.seal();
    }
  }

  render(): JSX.Element {
    return (
      <Html lang="en"> {/* Optional: Add lang attribute */}
        <Head>
          {/* Enforce order: 1. styled-jsx (initialProps.styles includes this), 2. styled-components */}
          {/* styles prop from getInitialProps now includes styled-jsx, initialProps.styles from Next itself */}
          {/* this.props.styles includes the flushed styled-jsx tags */}
          {this.props.styleTags} {/* styled-components tags */}
          <style>{'body { margin: 0 } /* custom! */'}</style>
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta charSet='utf-8' />
          <link
            href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800'
            rel='stylesheet'
          />
          {/* Socket.IO client script removed as it's obsolete after SSE migration. */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default AppDocument;
