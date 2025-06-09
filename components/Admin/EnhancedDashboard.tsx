import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Activity,
  Monitor,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CalendarIntegrationCard from "./CalendarIntegrationCard";
import PerformanceMonitorCard from "./PerformanceMonitorCard";
import DisplayStatusCard from "./DisplayStatusCard";
import { cn } from "@/lib/utils";

interface DashboardStats {
  overview: {
    totalBuildings: number;
    totalRooms: number;
    totalReservationsToday: number;
    totalReservationsThisWeek: number;
    totalReservationsThisMonth: number;
    currentMeetings: number;
    upcomingMeetingsToday: number;
    averageReservationsPerDay: number;
    roomUtilizationRate: number;
  };
  calendarIntegration: {
    totalConnections: number;
    activeConnections: number;
    syncSuccessRate: number;
    totalCalendarLinks: number;
    activeCalendarLinks: number;
  };
  upcomingMeetings: Array<{
    title: string;
    organizer: string;
    start_time: string;
    end_time: string;
    room_id: {
      name: string;
      building_id: {
        name: string;
      };
    };
  }>;
}

interface EnhancedDashboardProps {
  className?: string;
}

const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ className }) => {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["enhanced-dashboard"],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (rate >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-red-600 font-medium">Failed to load dashboard</p>
              <p className="text-red-500 text-sm">Please try refreshing the page</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = dashboardData?.overview;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buildings</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuildings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Rooms</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRooms || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReservationsToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.currentMeetings || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.roomUtilizationRate || 0}%</div>
            <Badge
              variant="outline"
              className={cn("text-xs mt-1", getUtilizationColor(stats?.roomUtilizationRate || 0))}
            >
              {(stats?.roomUtilizationRate || 0) >= 80 ? "High" :
               (stats?.roomUtilizationRate || 0) >= 60 ? "Medium" : "Low"} Usage
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Integration */}
        <CalendarIntegrationCard />

        {/* Performance Monitor */}
        <PerformanceMonitorCard />
      </div>

      {/* Display Status */}
      <DisplayStatusCard />

      {/* Upcoming Meetings */}
      {dashboardData?.upcomingMeetings && dashboardData.upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.upcomingMeetings.slice(0, 5).map((meeting, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{meeting.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Organized by {meeting.organizer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meeting.room_id.name} • {meeting.room_id.building_id.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Upcoming
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Calendar className="w-6 h-6" />
              <span className="text-sm">Book Room</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Monitor className="w-6 h-6" />
              <span className="text-sm">Manage Displays</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Activity className="w-6 h-6" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Summary */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData?.calendarIntegration.syncSuccessRate || 0}%
              </div>
              <div className="text-sm text-green-700">Calendar Sync Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboardData?.calendarIntegration.activeConnections || 0}
              </div>
              <div className="text-sm text-green-700">Active Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.averageReservationsPerDay || 0}
              </div>
              <div className="text-sm text-green-700">Avg Daily Bookings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDashboard;
