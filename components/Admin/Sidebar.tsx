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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import DropdownButton, { IDropdownChoice } from "../DropdownButton";

import { logout } from "../../helpers/auth"; // Assuming auth.js will be typed or allowJs
import { useDisplayContext } from "../../contexts/DisplayContext";
import { useDisplays } from "../../hooks/useDisplays";
import { useDisplayStatus } from "../../hooks/useDisplayStatus";

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
    router.push(`/layout?display=${id}`);
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

  const menu: IMenuItem[] = loggedIn
    ? [
        {
          id: "dashboard",
          name: "Dashboard",
          path: `/dashboard`,
          icon: BarChart3,
        },
        {
          id: "screen",
          name: "Screens",
          path: `/screens?display=${currentDisplayId}`,
          icon: Tv,
        },
        {
          id: "layout",
          name: "Layout",
          path: `/layout?display=${currentDisplayId}`,
          icon: Grid3X3,
        },
        {
          id: "preview",
          name: "Preview",
          path: `/preview?display=${currentDisplayId}`,
          icon: Eye,
        },
        {
          id: "slideshow",
          name: "Slideshows",
          path: `/slideshows?display=${currentDisplayId}`,
          icon: Images,
        },
        {
          id: "buildings",
          name: "Buildings",
          path: `/buildings`,
          icon: Building,
        },
        {
          id: "rooms",
          name: "Meeting Rooms",
          path: `/rooms`,
          icon: DoorOpen,
        },
        {
          id: "reservations",
          name: "Reservations",
          path: `/reservations`,
          icon: Calendar,
        },
        {
          id: "calendar-integration",
          name: "Calendar Sync",
          path: `/calendar-integration`,
          icon: CalendarDays,
        },
        {
          id: "users",
          name: "Users",
          path: `/users`,
          icon: Key,
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

  const dropdownChoices: IDropdownChoice[] = displays.map((d) => ({
    key: d._id,
    name: d.name,
  }));

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Display Selector */}
      {loggedIn && !collapsed && (
        <div className="p-4 border-b border-border">
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Display
            </p>
          </div>
          <DropdownButton
            onSelect={navigateToAdmin}
            choices={dropdownChoices}
            style={{ width: "100%" }}
            menuStyle={{ left: 0, top: "calc(100% + 5px)", width: "100%" }}
          >
            <div className="flex flex-row items-center p-3 cursor-pointer border border-border rounded-lg hover:bg-accent/50 transition-colors duration-200 bg-background">
              <div className="flex justify-center items-center pr-3">
                <Tv className="text-primary h-4 w-4" />
              </div>
              <div className="flex flex-col justify-center flex-1 whitespace-nowrap overflow-hidden">
                <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                  {context.state.name || "Select Display"}
                </span>
                <DisplayStatusIndicator
                  displayId={context.state.id || undefined}
                />
              </div>
              <div className="ml-auto pl-3">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </DropdownButton>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {menu.map((item) => {
            const isActive = pathname === item.path || (pathname && pathname.startsWith(item.path.split('?')[0]));
            return (
              <Link key={item.id} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    collapsed ? "justify-center" : "justify-start",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      {loggedIn && (
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group w-full",
              collapsed ? "justify-center" : "justify-start",
              "text-destructive hover:bg-destructive/10"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Logout
              </div>
            )}
          </button>
        </div>
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
      <Badge variant="destructive" className="text-xs">
        Offline
      </Badge>
    );
  }

  const status = getDisplayStatus(displayId);
  const isOnline = status.isOnline;

  return (
    <Badge variant={isOnline ? "success" : "destructive"} className="text-xs">
      {isOnline ? "Online" : "Offline"}
    </Badge>
  );
};

export default Sidebar;
