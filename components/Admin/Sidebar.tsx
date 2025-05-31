import Link from 'next/link';
import React, { useEffect } from 'react'; // Removed useState
import Router, { NextRouter, withRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faKey,
  faTv,
  faEye,
  faThLarge,
  faImages,
  faSignOutAlt,
  faCaretDown, // Added missing caret-down
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import DropdownButton, { IDropdownChoice } from '../DropdownButton'; // Already .tsx

import { logout } from '../../helpers/auth'; // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from '../../contexts/DisplayContext';
// getDisplays and IDisplayData are no longer directly used here for fetching
// IDisplayData is still relevant for the type from useGlobalDisplayList
import { IDisplayData } from '../../actions/display';
import { useGlobalDisplayList } from '../../contexts/GlobalDisplayListContext';

interface IMenuItem {
  id: string;
  name: string;
  path: string;
  icon: IconDefinition;
}

// Props injected by withRouter HOC
export interface WithRouterProps {
  router: NextRouter;
}

export interface ISidebarProps extends WithRouterProps {
  loggedIn?: boolean;
  displayId?: string | null; // This prop was passed from Frame.tsx
}

const Sidebar: React.FC<ISidebarProps> = ({ router, loggedIn, displayId }) => {
    const context = useDisplayContext(); // This is for the currently selected display context
    const { displays: globalDisplays, isLoading, error: globalDisplayError } = useGlobalDisplayList();
  
    useEffect(() => {
      if (globalDisplayError) {
        console.error("Error fetching global displays:", globalDisplayError);
      }
    }, [globalDisplayError]);

    const navigateToAdmin = (id: string): void => {
      // This method is called by DropdownButton with the key of the selected choice (which is display._id)
      Router.push(`/layout?display=${id}`);
      context.setId(id); // Update the context
    };
  
    const handleLogout = (): void => {
      logout()
        .then(() => {
          // Router.push('/login'); // Or wherever logout should redirect
        })
        .catch(error => {
          console.error("Logout failed:", error);
        });
    };
  
    // Use displayId prop for constructing menu paths if available, otherwise fallback to context or first display
    const currentDisplayId = displayId || context.state.id || (globalDisplays && globalDisplays.length > 0 ? globalDisplays[0]._id : '');

  const menu: IMenuItem[] = loggedIn
    ? [
        {
          id: 'screen',
          name: 'Screens',
          path: `/screens?display=${currentDisplayId}`,
          icon: faTv,
        },
        {
          id: 'layout',
          name: 'Layout',
          path: `/layout?display=${currentDisplayId}`,
          icon: faThLarge,
        },
        {
          id: 'preview',
          name: 'Preview',
          path: `/preview?display=${currentDisplayId}`, // Assuming a preview page exists
          icon: faEye,
        },
        {
          id: 'slideshow',
          name: 'Slideshows',
          path: `/slideshows?display=${currentDisplayId}`,
          icon: faImages,
        },
      ]
    : [
        {
          id: 'login',
          name: 'Login',
          path: `/login?display=${currentDisplayId}`,
          icon: faKey,
        },
      ];

  const dropdownChoices: IDropdownChoice[] = globalDisplays
    ? globalDisplays.map(d => ({ key: d._id, name: d.name }))
    : [];

  // TODO: Add a loading indicator for the dropdown if isLoading is true
  // For now, it will just show an empty dropdown until displays are loaded

  return (
    <div className='sidebar'>
      {loggedIn && (
        <DropdownButton
          onSelect={navigateToAdmin}
          choices={dropdownChoices}
          disabled={isLoading} // Disable dropdown while loading
          style={{ marginTop: 20, marginBottom: 20, width: 'calc(100% - 40px)', marginLeft: 20, marginRight: 20 }} // Adjusted style
          menuStyle={{ left: 20, top: 'calc(100% + 5px)', width: 'calc(100% - 40px)' }} // Adjusted style
        >
          <div className='logo'>
            <div className='icon'>
              <FontAwesomeIcon icon={faTv} fixedWidth color='#7bc043' />
            </div>
            <div className='info'>
              <span className='name'>{isLoading ? "Loading..." : (context.state.name || 'Select Display')}</span>
              <span className='status online'>online</span> {/* TODO: Hardcoded status */}
            </div>
            <div className='caret'>
              <FontAwesomeIcon icon={faCaretDown} fixedWidth />
            </div>
          </div>
        </DropdownButton>
      )}
      <ul className='menu-list'> {/* Renamed class for clarity */}
        {menu.map(item => (
          <Link href={item.path} key={item.id} legacyBehavior>
            <li className={item.path === router.pathname ? 'active' : ''}>
              <a> {/* Anchor tag is child of li for Link with legacyBehavior */}
                <FontAwesomeIcon icon={item.icon} fixedWidth />
                <span className={'text'}>
                  {'   '}
                  {item.name}
                </span>
              </a>
            </li>
          </Link>
        ))}
      </ul>
      {loggedIn && (
        <div className='logout' onClick={handleLogout} role="button" tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') handleLogout()}}>
          {/* Anchor tag is not strictly necessary if onClick is on div, but kept for style consistency */}
          <a>
            <FontAwesomeIcon icon={faSignOutAlt} fixedWidth />
            <span className={'text'}>{'   Logout'}</span>
          </a>
        </div>
      )}
      <style jsx>
        {`
          .sidebar {
            min-width: 300px;
            max-width: 300px;
            min-height: 100vh;
            background: white;
            display: flex;
            flex-direction: column;
            border-right: 1px solid #e0e0e0; /* Added a subtle border */
          }
          .menu-list { /* Changed from .menu */
            list-style: none;
            padding: 0px;
            margin: 0px;
            display: flex;
            flex-direction: column;
            flex: 1;
            width: 100%;
          }
          .menu-list li, /* Changed from .menu li */
          .logout {
            padding: 20px;
            text-transform: uppercase;
            font-family: 'Open Sans', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #4f4f4f;
            display: block; /* Make li take full width for click */
          }
          .menu-list li a, /* Style for anchor within li */
          .logout a {
            text-decoration: none;
            color: inherit;
            display: flex; /* Align icon and text */
            align-items: center;
          }
          .menu-list li.active, /* Changed from .menu li.active */
          .menu-list li:hover, /* Changed from .menu li:hover */
          .logout:hover {
            background: #f0f0f0;
            cursor: pointer;
          }
          .menu-list li .text, /* Changed from .menu li .text */
          .logout .text {
            margin-left: 8px;
          }
          .logo {
            display: flex;
            flex-direction: row;
            align-items: center; /* Vertically align items in logo */
            padding: 10px 20px; /* Consistent padding */
            position: relative;
            cursor: pointer;
            border: 1px solid #e0e0e0; /* Added border */
            border-radius: 4px;
            margin: 0 20px; /* Horizontal margin for the button itself */
          }
          .logo .icon {
            /* min-width: 3em; */ /* Removed fixed sizes for responsiveness */
            /* min-height: 3em; */
            padding-right: 15px; /* Spacing for icon */
            display: flex;
            justify-content: center;
            align-items: center;
            /* transform: scale(2); */ /* Scale might be too large */
            font-size: 2em; /* Control icon size with font-size */
          }
          .logo .info {
            font-family: 'Open Sans', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            white-space: nowrap;
            overflow: hidden;
            flex: 1; /* Allow info to take available space */
          }
          .logo .info .name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 1em;
          }
          .logo .info .status.online {
            color: #7bc043;
            font-size: 0.8em;
          }
          .logo .info .status.online::before {
            content: '•';
            color: #7bc043;
            font-size: 24px; /* Adjusted dot size */
            vertical-align: middle;
            line-height: 16px;
            padding-right: 4px;
          }
          .logo .caret {
            /* position: absolute; */ /* Not needed with flex */
            /* top: 50%; */
            /* margin-top: -8px; */
            /* right: 16px; */
            margin-left: auto; /* Push caret to the right */
            padding-left: 10px;
          }
          @media only screen and (max-width: 900px) {
            .sidebar {
              min-width: 60px; /* Adjust for collapsed view */
              max-width: 60px;
            }
            .logo .info,
            .logo .caret { /* Hide info and caret */
              display: none;
            }
            .logo .icon {
              padding-right: 0; /* Remove padding when text is hidden */
              font-size: 1.5em; /* Adjust icon size for collapsed */
            }
            .logo {
              margin: 10px; /* Adjust margins */
              padding: 10px; /* Adjust padding */
              justify-content: center; /* Center icon */
            }
            .menu-list li .text, /* Changed from .menu li .text */
            .logout .text {
              display: none;
            }
            .menu-list li, /* Changed from .menu li */
            .logout {
              justify-content: center; /* Center icons in collapsed menu */
            }
            .menu-list li a,
            .logout a {
              justify-content: center; /* Center icon within anchor */
            }
          }
        `}
      </style>
    </div>
  );
};

export default withRouter(Sidebar);
