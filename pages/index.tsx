import React from 'react';
import Link from 'next/link';
import Router from 'next/router';
import { NextPageContext } from 'next';

import DropdownButton, { IDropdownChoice } from '../components/DropdownButton'; // Assuming DropdownButton is or will be typed
import { getDisplays, IDisplayData } from '../actions/display'; // getDisplays is now typed

// Simplified display data for the dropdown
interface IDisplaySummary {
  _id: string;
  name: string;
}

interface IIndexPageProps {
  displays: IDisplaySummary[];
  host: string;
}

interface IIndexPageState {
  displays: IDisplaySummary[];
}

class Index extends React.Component<IIndexPageProps, IIndexPageState> {
  constructor(props: IIndexPageProps) {
    super(props);

    this.state = {
      displays: props.displays || [],
    };
  }

  static async getInitialProps(ctx: NextPageContext): Promise<IIndexPageProps> {
    const host =
      ctx.req && ctx.req.headers && ctx.req.headers.host
        ? 'http://' + ctx.req.headers.host
        : typeof window !== 'undefined' ? window.location.origin : ''; // Handle server/client side host
    
    let displayList: IDisplaySummary[] = [];
    try {
      // getDisplays returns IDisplayData[], map to IDisplaySummary[]
      const fullDisplayList: IDisplayData[] = await getDisplays(host);
      displayList = fullDisplayList.map(display => ({
        _id: display._id,
        name: display.name,
      }));
    } catch (error) {
      console.error("Failed to fetch displays:", error);
      // Return empty or default displays on error
    }
    return { displays: displayList, host: host };
  }

  navigateToDisplay = (id: string): void => {
    Router.push('/display/' + id);
  };

  render() {
    const { displays = [] } = this.state;
    const dropdownChoices: IDropdownChoice[] = displays.map(display => ({
      key: display._id,
      name: display.name,
    }));

    return (
      <div className='home'>
        <p>The Digital Signage server is running in the background.</p>
        <div className='btn-group'>
          <Link href='/layout' style={{ margin: 20 }}>
            <div className='btn admin'>Admin Home</div>
          </Link>
          <div style={{ margin: 20 }}>
            <DropdownButton
              icon='chevron-down'
              text='Display Home'
              style={styles.btn} // Consuming from styles object
              onSelect={this.navigateToDisplay}
              choices={dropdownChoices}
            />
          </div>
        </div>
        <style jsx>
          {`
            .home {
              font-family: 'Open Sans', sans-serif;
              padding: 40px;
              max-width: 960px;
              margin: auto;
              text-align: center;
            }
            .home p {
              margin-bottom: 20px;
            }
            .btn-group {
              display: flex;
              flex-direction: row;
              justify-content: center;
              align-items: center;
            }
            .btn {
              background: lightgray; /* This is a base style overridden by .admin or .home if DropdownButton had those classes */
              padding: 20px;
              text-decoration: none;
              text-transform: uppercase;
              color: white;
              border-radius: 4px;
              margin: 20px; /* Note: Link already has margin: 20, this is redundant if applied to same element */
              font-size: 16px; /* Corrected: was 16 */
            }
            .btn.admin {
              background: #03a9f4;
            }
            /* .btn.home was defined but not used on DropdownButton directly */
            /* If DropdownButton itself needs styling like .btn.home, it should handle it or be passed a className */
          `}
        </style>
      </div>
    );
  }
}

// Define types for the styles object
interface IComponentStyles {
  btn: React.CSSProperties;
  btnAdmin: React.CSSProperties; // Though btnAdmin class is used in JSX, its style obj isn't directly applied in component logic here
}

const styles: IComponentStyles = {
  btn: {
    padding: 20,
    textDecoration: 'none',
    textTransform: 'uppercase',
    borderRadius: 4,
    fontSize: 16,
    // background: '#8bc34a', // Example if this was for the "Display Home" button
    // color: 'white', // Example
  },
  btnAdmin: { // This specific style object is not directly used by any component in the render method.
              // The .btn.admin class is used in the JSX style block.
    background: '#03a9f4',
  },
};

export default Index;
