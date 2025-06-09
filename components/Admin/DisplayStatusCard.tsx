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

  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useLayoutDisplayStatus } from "@/hooks/useLayoutDisplayStatus";
import { cn } from "@/lib/utils";

// Empty state component for when no displays are found
interface EmptyDisplayStateProps {
  layoutId?: string;
  totalCount: number;
  onlineCount: number;
  error?: string | null;
}

const EmptyDisplayState: React.FC<EmptyDisplayStateProps> = ({
  layoutId,
  totalCount,
  onlineCount,
  error
}) => {
  // Determine the appropriate message based on the situation
  const getEmptyStateMessage = () => {
    if (error) {
      return {
        title: "Unable to load displays",
        description: "Please check your connection and try again",
        icon: AlertTriangle,
        variant: "error" as const
      };
    }

    if (totalCount === 0) {
      // No displays configured at all
      return {
        title: layoutId ? "No displays assigned to this layout" : "No displays configured",
        description: layoutId
          ? "Assign displays to this layout to monitor their status here"
          : "Create and configure your first display to get started",
        icon: Monitor,
        variant: "empty" as const
      };
    }

    if (onlineCount === 0) {
      // Displays exist but none are online
      return {
        title: "No displays currently online",
        description: layoutId
          ? "All displays for this layout are currently offline"
          : "All configured displays are currently offline or disconnected",
        icon: WifiOff,
        variant: "offline" as const
      };
    }

    // Fallback
    return {
      title: "No displays found",
      description: "Unable to load display information",
      icon: Monitor,
      variant: "empty" as const
    };
  };

  const { title, description, icon: Icon, variant } = getEmptyStateMessage();

  const getVariantStyles = () => {
    switch (variant) {
      case "error":
        return "text-red-500";
      case "offline":
        return "text-orange-500";
      case "empty":
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="text-center py-12 px-4">
      <div className={cn("mx-auto mb-4", getVariantStyles())}>
        <Icon className="w-16 h-16 mx-auto opacity-50" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        {description}
      </p>

      {/* Action suggestions based on state */}
      <div className="space-y-2 text-xs text-muted-foreground">
        {variant === "empty" && !layoutId && (
          <div className="space-y-1">
            <p>• Create a new display from the displays page</p>
            <p>• Configure display settings and assign layouts</p>
            <p>• Connect your display devices to start monitoring</p>
          </div>
        )}

        {variant === "empty" && layoutId && (
          <div className="space-y-1">
            <p>• Go to the displays page to assign displays to this layout</p>
            <p>• Create new displays if none exist yet</p>
          </div>
        )}

        {variant === "offline" && (
          <div className="space-y-1">
            <p>• Check display device power and network connections</p>
            <p>• Verify display URLs are accessible</p>
            <p>• Review display configuration settings</p>
          </div>
        )}

        {variant === "error" && (
          <div className="space-y-1">
            <p>• Check your internet connection</p>
            <p>• Refresh the page to try again</p>
            <p>• Contact support if the problem persists</p>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const _onlineDisplays = getOnlineDisplays();
  const _offlineDisplays = getOfflineDisplays();

  const _formatLastSeen = (date?: Date) => {
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

  const _getStatusBadge = (isOnline: boolean) => {
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

  const _getUptimeBadge = (percentage?: number) => {
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
                  title={isLoading ? "Refreshing..." : "Refresh status"}
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {error.includes('Failed to fetch') || error.includes('Network Error')
                          ? 'Unable to connect to server'
                          : 'Error loading display data'
                        }
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshStatus}
                      disabled={isLoading}
                      className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    {error.includes('Failed to fetch') || error.includes('Network Error')
                      ? 'Please check your network connection and try again.'
                      : error
                    }
                  </p>
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
                    <EmptyDisplayState
                      layoutId={layoutId}
                      totalCount={totalCount}
                      onlineCount={onlineCount}
                      error={error}
                    />
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
