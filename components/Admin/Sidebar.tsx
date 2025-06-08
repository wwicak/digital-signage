import Link from 'next/link'
import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Key,
  Tv,
  Eye,
  Grid3X3,
  Images,
  LogOut,
  ChevronDown,
  type 
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import DropdownButton, { IDropdownChoice } from '../DropdownButton'

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
  icon: ;
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
          icon: Tv,
        },
        {
          id: 'layout',
          name: 'Layout',
          path: `/layout?display=${currentDisplayId}`,
          icon: Grid3X3,
        },
        {
          id: 'preview',
          name: 'Preview',
          path: `/preview?display=${currentDisplayId}`, // Assuming a preview page exists
          icon: Eye,
        },
        {
          id: 'slideshow',
          name: 'Slideshows',
          path: `/slideshows?display=${currentDisplayId}`,
          icon: Images,
        },
        {
          id: 'users',
          name: 'Users',
          path: `/users`,
          icon: Key,
        },
      ]
    : [
        {
          id: 'login',
          name: 'Login',
          path: `/login?display=${currentDisplayId}`,
          icon: Key,
        },
      ]

  const dropdownChoices: IDropdownChoice[] = displays.map(d => ({
    key: d._id,
    name: d.name,
  }))

  return (
    <Card className="min-w-[300px] max-w-[300px] min-h-screen flex flex-col border-r rounded-none lg:min-w-[300px] lg:max-w-[300px] md:min-w-[60px] md:max-w-[60px]">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Logo/Brand Section */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <Tv className="text-primary-foreground h-6 w-6" />
              </div>
              <div className="ml-3 md:hidden">
                <h1 className="text-lg font-bold text-foreground">Digital Signage</h1>
              </div>
            </div>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Display Selector */}
        {loggedIn && (
          <div className="p-4 border-b">
            <DropdownButton
              onSelect={navigateToAdmin}
              choices={dropdownChoices}
              style={{ width: '100%' }}
              menuStyle={{ left: 0, top: 'calc(100% + 5px)', width: '100%' }}
            >
              <div className="flex flex-row items-center p-3 cursor-pointer border rounded-lg hover:bg-muted transition-colors duration-200">
                <div className="flex justify-center items-center pr-4 text-xl md:pr-0">
                  <Tv className="text-primary h-5 w-5" />
                </div>
                <div className="flex flex-col justify-center flex-1 whitespace-nowrap overflow-hidden md:hidden">
                  <span className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {context.state.name || 'Select Display'}
                  </span>
                  <DisplayStatusIndicator displayId={context.state.id || undefined} />
                </div>
                <div className="ml-auto pl-3 md:hidden">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </DropdownButton>
          </div>
        )}
        {/* Navigation Menu */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {menu.map(item => (
              <li key={item.id}>
                <Button
                  variant={item.path === pathname ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start md:justify-center h-12 px-3",
                    item.path === pathname && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  asChild
                >
                  <Link href={item.path}>
                    <item.icon className="h-5 w-5" />
                    <span className="ml-3 md:hidden font-medium">
                      {item.name}
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button */}
        {loggedIn && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start md:justify-center h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-3 md:hidden font-medium">Logout</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// DisplayStatusIndicator component
const DisplayStatusIndicator: React.FC<{ displayId?: string }> = ({ displayId }) => {
  const { getDisplayStatus } = useDisplayStatus();

  if (!displayId) {
    return (
      <Badge variant="destructive" className="text-xs">
        Offline
      </Badge>
    );
  }

  const status = getDisplayStatus(displayId);
  const isOnline = status.isOnline;

  return (
    <Badge
      variant={isOnline ? "success" : "destructive"}
      className="text-xs"
    >
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
};

export default Sidebar
