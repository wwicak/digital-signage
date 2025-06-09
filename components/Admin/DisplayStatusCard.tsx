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
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useLayoutDisplayStatus } from "@/hooks/useLayoutDisplayStatus";
import { cn } from "@/lib/utils";

// Individual display item component
interface DisplayItemProps {
  display: {
    _id: string;
    name: string;
    isOnline: boolean;
    lastSeen?: Date;
    ipAddress?: string;
    location?: string;
    building?: string;
    uptimePercentage?: number;
    responseTime?: number;
    connectionType?: string;
  };
}

const DisplayItem: React.FC<DisplayItemProps> = ({ display }) => {
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
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
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
            <span>{display.location || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatLastSeen(display.lastSeen)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {display.ipAddress || "Unknown IP"}
          </span>
          {getUptimeBadge(display.uptimePercentage)}
          {display.responseTime && (
            <Badge variant="outline" className="text-xs">
              {display.responseTime}ms
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground">
          {display.building || "Unknown Building"}
        </div>
        {display.connectionType && (
          <div className="text-xs text-muted-foreground mt-1">
            {display.connectionType.toUpperCase()}
          </div>
        )}
        {!display.isOnline && (
          <AlertTriangle className="w-4 h-4 text-red-500 mt-1 ml-auto" />
        )}
      </div>
    </div>
  );
};

interface DisplayStatusCardProps {
  className?: string;
  layoutId?: string; // Filter displays by layout ID
  title?: string; // Custom title for the card
  showLayoutInfo?: boolean; // Whether to show layout information
}

const DisplayStatusCard: React.FC<DisplayStatusCardProps> = ({
  className,
  layoutId,
  title,
  showLayoutInfo = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    displays,
    displaysByLayout,
    getOnlineDisplays,
    getOfflineDisplays,
    onlineCount,
    offlineCount,
    totalCount,
    uptimePercentage,
    refreshStatus,
    isLoading,
    error,
  } = useLayoutDisplayStatus({
    layoutId,
    enableRealTimeUpdates: true,
    refreshInterval: 30000,
  });

  // Get displays for the current layout or all displays
  const currentDisplays = layoutId ? displays : Object.values(displaysByLayout).flat();
  const onlineDisplays = getOnlineDisplays();
  const offlineDisplays = getOfflineDisplays();

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
                  <CardTitle className="text-base">
                    {title || (layoutId ? `Layout Displays` : "Display Status")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </span>
                    ) : error ? (
                      <span className="text-red-500">Error loading displays</span>
                    ) : (
                      `${onlineCount} of ${totalCount} displays online`
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isLoading && !error && (
                  <Badge variant="outline" className="text-xs">
                    {onlineCount} paired
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={refreshStatus}
                  disabled={isLoading}
                  title="Refresh status"
                >
                  <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                </Button>
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
              {/* Error State */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Error loading display data</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              )}

              {/* Summary Stats */}
              {!error && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {isLoading ? "..." : onlineCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Online</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {isLoading ? "..." : offlineCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Offline</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {isLoading ? "..." : totalCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              )}

              {/* Display List */}
              {!error && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      {layoutId ? "Layout Displays" : "All Displays"}
                    </h4>
                    {showLayoutInfo && !layoutId && (
                      <Badge variant="secondary" className="text-xs">
                        Grouped by Layout
                      </Badge>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading displays...</span>
                    </div>
                  ) : currentDisplays.length > 0 ? (
                    <div className="space-y-2">
                      {/* Group by layout if showing all displays */}
                      {!layoutId && showLayoutInfo ? (
                        Object.entries(displaysByLayout).map(([layout, layoutDisplays]) => (
                          <div key={layout} className="space-y-2">
                            <div className="flex items-center gap-2 py-2 border-b">
                              <h5 className="text-sm font-medium text-muted-foreground">
                                Layout: {layout}
                              </h5>
                              <Badge variant="outline" className="text-xs">
                                {layoutDisplays.length} displays
                              </Badge>
                            </div>
                            {layoutDisplays.map((display) => (
                              <DisplayItem key={display._id} display={display} />
                            ))}
                          </div>
                        ))
                      ) : (
                        currentDisplays.map((display) => (
                          <DisplayItem key={display._id} display={display} />
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {layoutId ? "No displays found for this layout" : "No displays found"}
                      </p>
                      <p className="text-xs">
                        {layoutId ? "Assign displays to this layout to see them here" : "Connect displays to see them here"}
                      </p>
                    </div>
                  )}
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
