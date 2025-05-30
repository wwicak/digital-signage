import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
  DocumentInitialProps,
} from 'next/document';
import { ServerStyleSheet } from 'styled-components';
import React, { JSX } from 'react';

interface IAppDocumentProps extends DocumentInitialProps {
  styleTags?: React.ReactElement[]; // From styled-components
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

      return {
        ...initialProps,
        styleTags: sheet.getStyleElement(), // styled-components styles
      };
    } finally {
      sheet.seal();
    }
  }

  render(): JSX.Element {
    return (
      <Html lang="en">
        <Head>
          {/* styled-components styles */}
          {this.props.styleTags}
          <style>{'body { margin: 0 } /* custom! */'}</style>
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta charSet='utf-8' />
          <link
            href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800'
            rel='stylesheet'
          />
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
