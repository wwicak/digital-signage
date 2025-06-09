import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Monitor,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useDisplayStatus } from "@/hooks/useDisplayStatus";
import { cn } from "@/lib/utils";

interface DisplayInfo {
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen?: Date;
  ipAddress?: string;
  location?: string;
  building?: string;
  clientCount?: number;
  uptimePercentage?: number;
}

interface DisplayStatusCardProps {
  className?: string;
}

const DisplayStatusCard: React.FC<DisplayStatusCardProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    displayStatus,
    getOnlineDisplays,
    getOfflineDisplays,
    refreshStatus,
    isLoadingStats,
  } = useDisplayStatus({
    enableRealTimeUpdates: true,
    refreshInterval: 30000,
  });

  // Mock display data - in real implementation, this would come from your displays API
  const mockDisplays: DisplayInfo[] = [
    {
      id: "display-1",
      name: "Main Lobby Display",
      isOnline: true,
      lastSeen: new Date(Date.now() - 120000), // 2 minutes ago
      ipAddress: "192.168.1.101",
      location: "Main Lobby",
      building: "Main Office Building",
      clientCount: 1,
      uptimePercentage: 98.5,
    },
    {
      id: "display-2",
      name: "Conference Room A",
      isOnline: true,
      lastSeen: new Date(Date.now() - 60000), // 1 minute ago
      ipAddress: "192.168.1.102",
      location: "Conference Room A",
      building: "Main Office Building",
      clientCount: 1,
      uptimePercentage: 99.2,
    },
    {
      id: "display-3",
      name: "Cafeteria Display",
      isOnline: false,
      lastSeen: new Date(Date.now() - 1800000), // 30 minutes ago
      ipAddress: "192.168.1.103",
      location: "Cafeteria",
      building: "Main Office Building",
      clientCount: 0,
      uptimePercentage: 85.3,
    },
    {
      id: "display-4",
      name: "Innovation Center Entrance",
      isOnline: true,
      lastSeen: new Date(Date.now() - 30000), // 30 seconds ago
      ipAddress: "192.168.2.101",
      location: "Main Entrance",
      building: "Innovation Center",
      clientCount: 1,
      uptimePercentage: 97.8,
    },
  ];

  const onlineDisplays = mockDisplays.filter(d => d.isOnline);
  const offlineDisplays = mockDisplays.filter(d => !d.isOnline);
  const totalDisplays = mockDisplays.length;

  const formatLastSeen = (date?: Date) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadge = (isOnline: boolean) => {
    return (
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "text-xs",
          isOnline 
            ? "bg-green-100 text-green-800 border-green-200" 
            : "bg-red-100 text-red-800 border-red-200"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3 mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </>
        )}
      </Badge>
    );
  };

  const getUptimeBadge = (percentage?: number) => {
    if (!percentage) return null;
    
    const color = percentage >= 95 ? "green" : percentage >= 85 ? "yellow" : "red";
    
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          color === "green" && "border-green-200 text-green-700",
          color === "yellow" && "border-yellow-200 text-yellow-700",
          color === "red" && "border-red-200 text-red-700"
        )}
      >
        {percentage.toFixed(1)}% uptime
      </Badge>
    );
  };

  return (
    <Card className={cn("", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Display Status</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {onlineDisplays.length} of {totalDisplays} displays online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {onlineDisplays.length} paired
                </Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {onlineDisplays.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Online</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {offlineDisplays.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Offline</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {totalDisplays}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              {/* Display List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Connected Displays</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshStatus}
                    disabled={isLoadingStats}
                    className="h-7 px-2 text-xs"
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    {isLoadingStats ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>

                {mockDisplays.map((display) => (
                  <div
                    key={display.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium truncate">
                          {display.name}
                        </h5>
                        {getStatusBadge(display.isOnline)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{display.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatLastSeen(display.lastSeen)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {display.ipAddress}
                        </span>
                        {getUptimeBadge(display.uptimePercentage)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {display.building}
                      </div>
                      {!display.isOnline && (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {mockDisplays.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No displays found</p>
                  <p className="text-xs">Connect displays to see them here</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DisplayStatusCard;
