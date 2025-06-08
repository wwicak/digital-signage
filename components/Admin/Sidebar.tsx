import Link from 'next/link'
import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faKey,
  faTv,
  faEye,
  faThLarge,
  faImages,
  faSignOutAlt,
  faCaretDown, // Added missing caret-down
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import DropdownButton, { IDropdownChoice } from '../DropdownButton' // Already .tsx

import { logout } from '../../helpers/auth' // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from '../../contexts/DisplayContext'
import { useDisplays } from '../../hooks/useDisplays'
import { useDisplayStatus } from '../../hooks/useDisplayStatus'

// Simplified display data for local state
interface ISimpleDisplay {
  _id: string;
  name: string;
}

interface IMenuItem {
  id: string;
  name: string;
  path: string;
  icon: IconDefinition;
}

export interface ISidebarProps {
  loggedIn?: boolean;
  displayId?: string | null; // This prop was passed from Frame.tsx
}

const Sidebar: React.FC<ISidebarProps> = ({ loggedIn, displayId }) => {
    const router = useRouter()
    const pathname = usePathname()
    const { data: displaysData = [] } = useDisplays()
    const context = useDisplayContext()
    
    // Transform displays data to simple format for dropdown
    const displays: ISimpleDisplay[] = displaysData.map(d => ({ _id: d._id, name: d.name }))
  
    const navigateToAdmin = (id: string): void => {
      // This method is called by DropdownButton with the key of the selected choice (which is display._id)
      router.push(`/layout?display=${id}`)
      context.setId(id) // Update the context
    }
  
    const handleLogout = (): void => {
      logout()
        .then(() => {
          // Router.push('/login'); // Or wherever logout should redirect
        })
        .catch(error => {
          console.error('Logout failed:', error)
        })
    }
  
    // Use displayId prop for constructing menu paths if available, otherwise fallback to context or first display
    const currentDisplayId = displayId || context.state.id || (displays.length > 0 ? displays[0]._id : '')

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
        {
          id: 'users',
          name: 'Users',
          path: `/users`,
          icon: faKey,
        },
      ]
    : [
        {
          id: 'login',
          name: 'Login',
          path: `/login?display=${currentDisplayId}`,
          icon: faKey,
        },
      ]

  const dropdownChoices: IDropdownChoice[] = displays.map(d => ({
    key: d._id,
    name: d.name,
  }))

  return (
    <div className="min-w-[300px] max-w-[300px] min-h-screen bg-white flex flex-col border-r border-gray-200 lg:min-w-[300px] lg:max-w-[300px] md:min-w-[60px] md:max-w-[60px]">
      {loggedIn && (
        <DropdownButton
          onSelect={navigateToAdmin}
          choices={dropdownChoices}
          style={{ marginTop: 20, marginBottom: 20, width: 'calc(100% - 40px)', marginLeft: 20, marginRight: 20 }}
          menuStyle={{ left: 20, top: 'calc(100% + 5px)', width: 'calc(100% - 40px)' }}
        >
          <div className="flex flex-row items-center p-3 mx-5 my-5 cursor-pointer border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <div className="flex justify-center items-center pr-4 text-2xl md:pr-0 md:text-xl">
              <FontAwesomeIcon icon={faTv} fixedWidth color='#7bc043' />
            </div>
            <div className="flex flex-col justify-center flex-1 whitespace-nowrap overflow-hidden font-sans md:hidden">
              <span className="font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis">
                {context.state.name || 'Select Display'}
              </span>
              <DisplayStatusIndicator displayId={context.state.id || undefined} />
            </div>
            <div className="ml-auto pl-3 md:hidden">
              <FontAwesomeIcon icon={faCaretDown} fixedWidth />
            </div>
          </div>
        </DropdownButton>
      )}
      <ul className="list-none p-0 m-0 flex flex-col flex-1 w-full">
        {menu.map(item => (
          <Link href={item.path} key={item.id} legacyBehavior>
            <li className={`p-5 uppercase font-sans text-base font-semibold text-gray-600 block hover:bg-gray-100 cursor-pointer transition-colors duration-200 md:justify-center ${
              item.path === pathname ? 'bg-gray-100' : ''
            }`}>
              <a className="no-underline text-inherit flex items-center md:justify-center">
                <FontAwesomeIcon icon={item.icon} fixedWidth />
                <span className="ml-2 md:hidden">
                  {item.name}
                </span>
              </a>
            </li>
          </Link>
        ))}
      </ul>
      {loggedIn && (
        <div
          className="p-5 uppercase font-sans text-base font-semibold text-gray-600 block hover:bg-gray-100 cursor-pointer transition-colors duration-200 md:justify-center"
          onClick={handleLogout}
          role='button'
          tabIndex={0}
          onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') handleLogout()}}
        >
          <a className="no-underline text-inherit flex items-center md:justify-center">
            <FontAwesomeIcon icon={faSignOutAlt} fixedWidth />
            <span className="ml-2 md:hidden">Logout</span>
          </a>
        </div>
      )}

    </div>
  )
}

// DisplayStatusIndicator component
const DisplayStatusIndicator: React.FC<{ displayId?: string }> = ({ displayId }) => {
  const { getDisplayStatus } = useDisplayStatus();

  if (!displayId) {
    return (
      <span className="text-red-500 text-sm flex items-center">
        <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
        offline
      </span>
    );
  }

  const status = getDisplayStatus(displayId);
  const isOnline = status.isOnline;

  return (
    <span className={`text-sm flex items-center ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
      <span className={`w-2 h-2 rounded-full mr-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {isOnline ? 'online' : 'offline'}
    </span>
  );
};

export default Sidebar
