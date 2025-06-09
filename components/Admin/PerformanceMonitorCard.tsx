import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Monitor,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  loadTime: number;
  renderTime: number;
  networkLatency: number;
  errorCount: number;
  warningCount: number;
}

interface DisplayPerformance {
  displayId: string;
  displayName: string;
  isOnline: boolean;
  lastHeartbeat: string;
  performanceMetrics?: PerformanceMetrics;
  averageMetrics?: PerformanceMetrics;
}

interface PerformanceMonitorCardProps {
  className?: string;
  displayId?: string;
}

const PerformanceMonitorCard: React.FC<PerformanceMonitorCardProps> = ({
  className,
  displayId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: performanceData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["display-performance", displayId],
    queryFn: async () => {
      const url = displayId 
        ? `/api/v1/displays/${displayId}/heartbeat`
        : "/api/v1/displays/performance";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch performance data");
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time monitoring
  });

  const getPerformanceStatus = (metrics?: PerformanceMetrics) => {
    if (!metrics) return { status: "unknown", color: "gray" };
    
    const issues = [];
    if (metrics.fps < 30) issues.push("Low FPS");
    if (metrics.memoryUsage > 80) issues.push("High Memory");
    if (metrics.cpuUsage > 80) issues.push("High CPU");
    if (metrics.errorCount > 0) issues.push("Errors");
    
    if (issues.length === 0) return { status: "excellent", color: "green" };
    if (issues.length <= 2) return { status: "good", color: "yellow" };
    return { status: "poor", color: "red" };
  };

  const formatMetric = (value: number, unit: string) => {
    return `${value.toFixed(1)}${unit}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "good":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "poor":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (current: number, average: number) => {
    if (current > average * 1.1) return <TrendingUp className="w-3 h-3 text-red-500" />;
    if (current < average * 0.9) return <TrendingDown className="w-3 h-3 text-green-500" />;
    return null;
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Performance Monitor Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            Failed to load performance data
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const metrics = performanceData?.performanceMetrics;
  const averageMetrics = performanceData?.averageMetrics;
  const { status, color } = getPerformanceStatus(metrics);

  return (
    <Card className={cn("", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Performance Monitor
            {displayId && (
              <Badge variant="outline" className="text-xs">
                <Monitor className="w-3 h-3 mr-1" />
                Single Display
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                color === "green" && "text-green-600 bg-green-50 border-green-200",
                color === "yellow" && "text-yellow-600 bg-yellow-50 border-yellow-200",
                color === "red" && "text-red-600 bg-red-50 border-red-200",
                color === "gray" && "text-gray-600 bg-gray-50 border-gray-200"
              )}
            >
              {getStatusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                refetch();
              }}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Key Metrics Summary */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-blue-500" />
                {averageMetrics && getTrendIcon(metrics.fps, averageMetrics.fps)}
              </div>
              <div className="text-lg font-bold text-blue-600">
                {formatMetric(metrics.fps, " FPS")}
              </div>
              <div className="text-xs text-blue-600">Frame Rate</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <HardDrive className="w-4 h-4 text-green-500" />
                {averageMetrics && getTrendIcon(metrics.memoryUsage, averageMetrics.memoryUsage)}
              </div>
              <div className="text-lg font-bold text-green-600">
                {formatMetric(metrics.memoryUsage, "%")}
              </div>
              <div className="text-xs text-green-600">Memory</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Cpu className="w-4 h-4 text-purple-500" />
                {averageMetrics && getTrendIcon(metrics.cpuUsage, averageMetrics.cpuUsage)}
              </div>
              <div className="text-lg font-bold text-purple-600">
                {formatMetric(metrics.cpuUsage, "%")}
              </div>
              <div className="text-xs text-purple-600">CPU</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                {averageMetrics && getTrendIcon(metrics.networkLatency, averageMetrics.networkLatency)}
              </div>
              <div className="text-lg font-bold text-orange-600">
                {formatMetric(metrics.networkLatency, "ms")}
              </div>
              <div className="text-xs text-orange-600">Latency</div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && metrics && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Performance Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Performance Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load Time:</span>
                    <span className="font-medium">{formatMetric(metrics.loadTime, "ms")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Render Time:</span>
                    <span className="font-medium">{formatMetric(metrics.renderTime, "ms")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Errors:</span>
                    <span className={cn("font-medium", metrics.errorCount > 0 && "text-red-600")}>
                      {metrics.errorCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warnings:</span>
                    <span className={cn("font-medium", metrics.warningCount > 0 && "text-yellow-600")}>
                      {metrics.warningCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Status Indicators</h4>
                <div className="space-y-2">
                  {metrics.fps >= 30 ? (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Smooth Performance
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Frame Rate
                    </Badge>
                  )}
                  
                  {metrics.memoryUsage < 80 ? (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Memory OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      High Memory Usage
                    </Badge>
                  )}
                  
                  {metrics.errorCount === 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      No Errors
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {metrics.errorCount} Errors
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!metrics && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No performance data available</p>
            <p className="text-xs">Performance metrics will appear when displays start reporting</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitorCard;
