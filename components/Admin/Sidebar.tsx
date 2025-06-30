import Link from "next/link";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Key,
  Tv,
  Eye,
  Grid3X3,
  Images,
  LogOut,
  ChevronDown,
  LucideIcon,
  Building,
  DoorOpen,
  Calendar,
  CalendarDays,
  BarChart3,
  Settings,
  Layout,
  Monitor,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import DropdownButton, { IDropdownChoice } from "../DropdownButton";

import { logout } from "../../helpers/auth"; // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from "../../contexts/DisplayContext";
import { useDisplays } from "../../hooks/useDisplays";
import { useDisplayStatus } from "../../hooks/useDisplayStatus";
import { useFeatureFlagAccess } from "../../hooks/useFeatureFlags";
import { FeatureFlagName } from "@/lib/types/feature-flags";

// Simplified display data for local state
interface ISimpleDisplay {
  _id: string;
  name: string;
}

interface IMenuItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  featureFlag?: FeatureFlagName;
}

export interface ISidebarProps {
  loggedIn?: boolean;
  displayId?: string | null; // This prop was passed from Frame.tsx
  collapsed?: boolean;
}

const Sidebar: React.FC<ISidebarProps> = ({ loggedIn, displayId, collapsed = false }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: displaysData = [] } = useDisplays();
  const context = useDisplayContext();

  // Transform displays data to simple format for dropdown
  const displays: ISimpleDisplay[] = displaysData.map((d) => ({
    _id: d._id,
    name: d.name,
  }));

  const navigateToAdmin = (id: string): void => {
    // This method is called by DropdownButton with the key of the selected choice (which is display._id)
    router.push(`/layouts?display=${id}`);
    context.setId(id); // Update the context
  };

  const handleLogout = (): void => {
    logout()
      .then(() => {
        // Router.push('/login'); // Or wherever logout should redirect
      })
      .catch((error) => {
        console.error("Logout failed:", error);
      });
  };

  // Use displayId prop for constructing menu paths if available, otherwise fallback to context or first display
  const currentDisplayId =
    displayId ||
    context.state.id ||
    (displays.length > 0 ? displays[0]._id : "");

  const allMenuItems: IMenuItem[] = loggedIn
    ? [
        {
          id: "layouts",
          name: "Layouts",
          path: `/layouts`,
          icon: Layout,
          featureFlag: FeatureFlagName.MENU_LAYOUT,
        },
        {
          id: "screens",
          name: "Connected Displays",
          path: `/screens`,
          icon: Monitor,
          featureFlag: FeatureFlagName.MENU_SCREENS,
        },
        {
          id: "dashboard",
          name: "Dashboard",
          path: `/dashboard`,
          icon: BarChart3,
          featureFlag: FeatureFlagName.MENU_DASHBOARD,
        },
        {
          id: "layout-editor",
          name: "Layout Editor",
          path: `/layout-admin`,
          icon: Grid3X3,
          featureFlag: FeatureFlagName.MENU_LAYOUT,
        },
        {
          id: "preview",
          name: "Preview",
          path: `/preview?display=${currentDisplayId}`,
          icon: Eye,
          featureFlag: FeatureFlagName.MENU_PREVIEW,
        },
        {
          id: "slideshow",
          name: "Slideshows",
          path: `/slideshows?display=${currentDisplayId}`,
          icon: Images,
          featureFlag: FeatureFlagName.MENU_SLIDESHOWS,
        },
        {
          id: "buildings",
          name: "Buildings",
          path: `/buildings`,
          icon: Building,
          featureFlag: FeatureFlagName.MENU_BUILDINGS,
        },
        {
          id: "rooms",
          name: "Meeting Rooms",
          path: `/rooms`,
          icon: DoorOpen,
          featureFlag: FeatureFlagName.MENU_ROOMS,
        },
        {
          id: "reservations",
          name: "Reservations",
          path: `/reservations`,
          icon: Calendar,
          featureFlag: FeatureFlagName.MENU_RESERVATIONS,
        },
        {
          id: "calendar-integration",
          name: "Calendar Sync",
          path: `/calendar-integration`,
          icon: CalendarDays,
          featureFlag: FeatureFlagName.MENU_CALENDAR_INTEGRATION,
        },
        {
          id: "users",
          name: "Users",
          path: `/users`,
          icon: Key,
          featureFlag: FeatureFlagName.MENU_USERS,
        },
        {
          id: "feature-flags",
          name: "Feature Flags",
          path: `/feature-flags`,
          icon: Settings,
          // No feature flag for this - only super admins can access
        },
      ]
    : [
        {
          id: "login",
          name: "Login",
          path: `/login?display=${currentDisplayId}`,
          icon: Key,
        },
      ];

  // Get feature flag access for menu filtering
  const { hasAccess: hasMenuAccess } = useFeatureFlagAccess(FeatureFlagName.MENU_DASHBOARD);

  // Filter menu items based on feature flag access
  const menu = allMenuItems.filter((item) => {
    if (!item.featureFlag) {
      // Special handling for feature flags menu - only show to super admins
      if (item.id === "feature-flags") {
        // This would need user context to check if super admin
        // For now, we'll show it and let the route handle the permission
        return true;
      }
      return true;
    }

    // For items with feature flags, we need to check access
    // Since we can't use hooks in filter, we'll handle this differently
    return true; // We'll filter in the render loop instead
  });

  const dropdownChoices: IDropdownChoice[] = displays.map((d) => ({
    key: d._id,
    name: d.name,
  }));

  return (
    <div className='h-full flex flex-col'>
      {/* Enhanced Display Selector */}
      {loggedIn && !collapsed && (
        <Card className='mx-0 mt-3 mb-4 border-border/50 bg-card/60 backdrop-blur-sm'>
          <CardContent className='p-4'>
            <div className='mb-3'>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-4'>
                <Tv className='w-3 h-3' />
                Active Display
              </p>
            </div>
            <DropdownButton
              onSelect={navigateToAdmin}
              choices={dropdownChoices}
              style={{ width: "100%" }}
              menuStyle={{ left: 0, top: "calc(100% + 5px)", width: "100%" }}
            >
              <Card className='cursor-pointer border-border/50 bg-background/50 hover:bg-accent/30 transition-all duration-300 hover:border-primary/30 hover:shadow-sm'>
                <CardContent className='p-3'>
                  <div className='flex items-center gap-3'>
                    <div className='flex justify-center items-center'>
                      <div className='w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center'>
                        <Tv className='text-primary h-3 w-3' />
                      </div>
                    </div>
                    <div className='flex flex-col justify-center flex-1 min-w-0'>
                      <span className='font-medium text-sm text-foreground whitespace-normal'>
                        {context.state.name || "Select Display"}
                      </span>
                      <DisplayStatusIndicator
                        displayId={context.state.id || undefined}
                      />
                    </div>
                    <ChevronDown className='h-4 w-4 text-muted-foreground flex-shrink-0' />
                  </div>
                </CardContent>
              </Card>
            </DropdownButton>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Navigation Menu */}
      <nav className='flex-1 px-0'>
        <div className='space-y-1'>
          {menu.map((item) => (
            <MenuItemWithFeatureFlag
              key={item.id}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* Enhanced Logout Section */}
      {loggedIn && (
        <Card className='mx-0 mb-3 border-border/50 bg-card/40 backdrop-blur-sm'>
          <CardContent className='p-3'>
            <Button
              onClick={handleLogout}
              variant='ghost'
              className={cn(
                "w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200",
                collapsed && "justify-center px-0"
              )}
            >
              <LogOut className='h-4 w-4' />
              {!collapsed && <span>Logout</span>}
              {collapsed && (
                <div className='absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50'>
                  Logout
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// DisplayStatusIndicator component
const DisplayStatusIndicator: React.FC<{ displayId?: string }> = ({
  displayId,
}) => {
  const { getDisplayStatus } = useDisplayStatus();

  if (!displayId) {
    return (
      <Badge variant='destructive' className='text-xs'>
        Offline
      </Badge>
    );
  }

  const status = getDisplayStatus(displayId);
  const isOnline = status.isOnline;

  return (
    <Badge variant={isOnline ? "success" : "destructive"} className='text-xs'>
      {isOnline ? "Online" : "Offline"}
    </Badge>
  );
};

// Component to handle feature flag checking for individual menu items
const MenuItemWithFeatureFlag: React.FC<{
  item: IMenuItem;
  pathname: string | null;
  collapsed: boolean;
}> = ({ item, pathname, collapsed }) => {
  const { hasAccess, isLoading } = useFeatureFlagAccess(
    item.featureFlag ?? FeatureFlagName.MENU_DASHBOARD
  );

  // If item has a feature flag and user doesn't have access, don't render
  if (item.featureFlag && !hasAccess && !isLoading) {
    return null;
  }

  // Show loading state for items with feature flags
  if (item.featureFlag && isLoading) {
    return (
      <div className='flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-50'>
        <div className='h-5 w-5 bg-muted animate-pulse rounded' />
        {!collapsed && <div className='h-4 bg-muted animate-pulse rounded flex-1' />}
      </div>
    );
  }

  const isActive = pathname === item.path || (pathname ? pathname.startsWith(item.path.split('?')[0]) : false);

  return (
    <Link href={item.path} className='block mb-1'>
      <Card
        className={cn(
          "transition-all duration-300 cursor-pointer group hover:shadow-sm",
          "border-transparent hover:border-border/50",
          collapsed ? "mx-3" : "mx-0",
          isActive
            ? "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-sm"
            : "bg-transparent hover:bg-accent/30"
        )}
      >
        <CardContent
          className={cn(
            "flex items-center transition-all duration-200",
            collapsed ? "p-2 justify-center" : "p-3 gap-3"
          )}
        >
          <div className={cn(
            "flex items-center justify-center rounded-lg transition-all duration-200",
            collapsed ? "w-8 h-8" : "w-9 h-9",
            isActive
              ? "bg-primary/15 text-primary"
              : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <item.icon className={cn(
              "transition-all duration-200",
              collapsed ? "h-4 w-4" : "h-4 w-4"
            )} />
          </div>
          
          {!collapsed && (
            <div className='flex-1 min-w-0'>
              <span className={cn(
                "font-medium text-sm transition-colors duration-200 truncate block",
                isActive
                  ? "text-primary"
                  : "text-foreground group-hover:text-primary"
              )}>
                {item.name}
              </span>
            </div>
          )}

          {collapsed && (
            <div className='absolute left-full ml-3 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg border border-border/50 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 backdrop-blur-sm'>
              {item.name}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default Sidebar;
