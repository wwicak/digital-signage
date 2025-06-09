import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Monitor,
  Wifi,
  WifiOff,
  Clock,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useDisplayStatus } from "@/hooks/useDisplayStatus";
import { cn } from "@/lib/utils";

interface NotificationEvent {
  id: string;
  displayId: string;
  displayName: string;
  type: "online" | "offline" | "alert";
  message: string;
  timestamp: Date;
  severity?: "low" | "medium" | "high";
  acknowledged?: boolean;
}

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationEvent[]>([]);
  const [filterType, setFilterType] = useState<"all" | "online" | "offline" | "alert">("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const {
    displayStatus,
    getOnlineDisplays,
    getOfflineDisplays,
    refreshStatus,
  } = useDisplayStatus({
    enableRealTimeUpdates: true,
    refreshInterval: 30000,
  });

  // Generate mock notifications based on display status
  useEffect(() => {
    const generateNotifications = () => {
      const mockNotifications: NotificationEvent[] = [];
      const onlineDisplays = getOnlineDisplays();
      const offlineDisplays = getOfflineDisplays();

      // Add online display notifications
      onlineDisplays.forEach((displayId, index) => {
        mockNotifications.push({
          id: `online-${displayId}-${Date.now()}`,
          displayId: displayId,
          displayName: `Display ${displayId.slice(-4)}`,
          type: "online",
          message: "Display came online",
          timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time within last hour
          severity: "low",
        });
      });

      // Add offline display notifications
      offlineDisplays.forEach((displayId, index) => {
        mockNotifications.push({
          id: `offline-${displayId}-${Date.now()}`,
          displayId: displayId,
          displayName: `Display ${displayId.slice(-4)}`,
          type: "offline",
          message: "Display went offline",
          timestamp: new Date(Date.now() - Math.random() * 7200000), // Random time within last 2 hours
          severity: "high",
        });
      });

      // Add some alert notifications
      if (offlineDisplays.length > 0) {
        mockNotifications.push({
          id: `alert-${Date.now()}`,
          displayId: "system",
          displayName: "System Alert",
          type: "alert",
          message: `${offlineDisplays.length} displays are currently offline`,
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          severity: "medium",
        });
      }

      // Sort by timestamp (newest first)
      mockNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(mockNotifications.slice(0, 20)); // Limit to 20 notifications
    };

    generateNotifications();
  }, [displayStatus, getOnlineDisplays, getOfflineDisplays]);

  // Filter notifications based on filters
  useEffect(() => {
    let filtered = notifications;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(n => 
        n.timestamp.toDateString() === filterDate.toDateString()
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, searchTerm, dateFilter]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "online":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "offline":
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const unreadCount = filteredNotifications.filter(n => !n.acknowledged).length;
  const onlineCount = getOnlineDisplays().length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8 relative", className)}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] bg-primary">
              {onlineCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Notifications
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {onlineCount} Online
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={refreshStatus}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="alert">Alerts</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 border-l-2 hover:bg-muted/50 transition-colors",
                        getSeverityColor(notification.severity)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {notification.displayName}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {notification.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
