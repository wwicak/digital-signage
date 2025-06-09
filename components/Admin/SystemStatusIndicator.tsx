import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { cn } from "@/lib/utils";

interface SystemStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  showTooltip?: boolean;
}

const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  className,
  showText = true,
  showTooltip = true,
}) => {
  const {
    isDatabaseConnected,
    isSystemHealthy,
    getStatusColor,
    getStatusText,
    getStatusDetails,
    refreshStatus,
    isLoading,
    error,
  } = useSystemStatus({
    refreshInterval: 30000,
    enableRealTimeUpdates: true,
  });

  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const statusDetails = getStatusDetails();

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-3 h-3 animate-spin" />;
    }

    if (isSystemHealthy) {
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    }

    if (!isDatabaseConnected) {
      return <Database className="w-3 h-3 text-red-500" />;
    }

    return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
  };

  const getIndicatorColor = () => {
    switch (statusColor) {
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      case "red":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const StatusIndicator = () => (
    <div
      className={cn(
        "hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 transition-all duration-200 hover:bg-muted/70",
        className
      )}
    >
      <div className="relative flex items-center">
        {getStatusIcon()}
        <div
          className={cn(
            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
            getIndicatorColor(),
            isLoading && "animate-pulse"
          )}
        />
      </div>

      {showText && (
        <span className="text-xs font-medium text-muted-foreground">
          {statusText}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-1 hover:bg-muted-foreground/20 rounded-full"
        onClick={(e) => {
          e.stopPropagation();
          refreshStatus();
        }}
        disabled={isLoading}
        title="Refresh system status"
      >
        <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
      </Button>
    </div>
  );

  if (!showTooltip) {
    return <StatusIndicator />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
            <StatusIndicator />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium text-sm">System Status</div>
            
            {statusDetails && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>Database:</span>
                  <span className={cn(
                    "font-medium",
                    statusDetails.database.status === "Connected" 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {statusDetails.database.status}
                  </span>
                </div>
                
                {statusDetails.database.responseTime && (
                  <div className="flex items-center justify-between">
                    <span>Response Time:</span>
                    <span className="font-medium">
                      {statusDetails.database.responseTime}ms
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span>Server:</span>
                  <span className={cn(
                    "font-medium capitalize",
                    statusDetails.server.status === "online" 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {statusDetails.server.status}
                  </span>
                </div>
                
                {statusDetails.server.uptime && (
                  <div className="flex items-center justify-between">
                    <span>Uptime:</span>
                    <span className="font-medium">
                      {Math.floor(statusDetails.server.uptime / 3600)}h {Math.floor((statusDetails.server.uptime % 3600) / 60)}m
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span>Last Checked:</span>
                  <span className="font-medium">
                    {new Date(statusDetails.lastChecked).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 mt-2">
                Error: {error.message}
              </div>
            )}

            {statusDetails?.database.error && (
              <div className="text-xs text-red-600 mt-2">
                DB Error: {statusDetails.database.error}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SystemStatusIndicator;
