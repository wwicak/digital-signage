import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Link,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CalendarIntegrationData {
  totalConnections: number;
  activeConnections: number;
  syncSuccessRate: number;
  totalCalendarLinks: number;
  activeCalendarLinks: number;
}

interface CalendarIntegrationCardProps {
  className?: string;
}

const CalendarIntegrationCard: React.FC<CalendarIntegrationCardProps> = ({
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-calendar"],
    queryFn: async () => {
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const calendarData: CalendarIntegrationData = dashboardData?.calendarIntegration || {
    totalConnections: 0,
    activeConnections: 0,
    syncSuccessRate: 0,
    totalCalendarLinks: 0,
    activeCalendarLinks: 0,
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 bg-green-50 border-green-200";
    if (rate >= 80) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (rate >= 80) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Calendar Integration
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
            <XCircle className="w-5 h-5" />
            Calendar Integration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            Failed to load calendar integration data
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Calendar Integration
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs", getStatusColor(calendarData.syncSuccessRate))}
            >
              {getStatusIcon(calendarData.syncSuccessRate)}
              {calendarData.syncSuccessRate}% Success
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
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {calendarData.totalCalendarLinks}
            </div>
            <div className="text-xs text-blue-600">Total Links</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {calendarData.activeCalendarLinks}
            </div>
            <div className="text-xs text-green-600">Active Links</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {calendarData.totalConnections}
            </div>
            <div className="text-xs text-purple-600">Connections</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {calendarData.activeConnections}
            </div>
            <div className="text-xs text-orange-600">Active</div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Connection Health */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Connection Health
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Success Rate</span>
                    <Badge className={cn("text-xs", getStatusColor(calendarData.syncSuccessRate))}>
                      {calendarData.syncSuccessRate}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Active Ratio</span>
                    <span className="text-xs font-medium">
                      {calendarData.totalCalendarLinks > 0 
                        ? Math.round((calendarData.activeCalendarLinks / calendarData.totalCalendarLinks) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Users className="w-3 h-3 mr-2" />
                    Manage Connections
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Clock className="w-3 h-3 mr-2" />
                    Sync History
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex flex-wrap gap-2">
              {calendarData.activeCalendarLinks > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {calendarData.activeCalendarLinks} Active
                </Badge>
              )}
              {calendarData.totalCalendarLinks - calendarData.activeCalendarLinks > 0 && (
                <Badge variant="outline" className="text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  {calendarData.totalCalendarLinks - calendarData.activeCalendarLinks} Inactive
                </Badge>
              )}
              {calendarData.syncSuccessRate < 100 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Sync Issues
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarIntegrationCard;
