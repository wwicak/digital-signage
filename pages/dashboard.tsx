import React, { useState, useEffect } from "react";
import Frame from "../components/Admin/Frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building,
  DoorOpen,
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  CalendarDays,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface IDashboardData {
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
  };
  roomUtilization: Array<{
    roomName: string;
    buildingName: string;
    reservationCount: number;
    totalDuration: number;
    utilizationPercentage: number;
  }>;
  buildingStats: Array<{
    buildingName: string;
    reservationCount: number;
  }>;
  recentActivity: Array<{
    _id: string;
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
    creation_date: string;
  }>;
  lastUpdated: string;
}

const DashboardPage = () => {
  const [data, setData] = useState<IDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && !data) {
    return (
      <Frame loggedIn={true}>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <RefreshCw className='h-8 w-8 animate-spin mx-auto mb-2' />
            <p className='text-muted-foreground'>Loading dashboard...</p>
          </div>
        </div>
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame loggedIn={true}>
        <div className='text-center py-8'>
          <p className='text-destructive'>{error}</p>
          <Button onClick={fetchDashboardData} className='mt-4'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Retry
          </Button>
        </div>
      </Frame>
    );
  }

  if (!data) return null;

  return (
    <Frame loggedIn={true}>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Meeting room system overview and statistics
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-muted-foreground'>
              Last updated: {formatTime(data.lastUpdated)}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={fetchDashboardData}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Buildings</CardTitle>
              <Building className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.overview?.totalBuildings || 0}</div>
              <p className='text-xs text-muted-foreground'>Total buildings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Meeting Rooms</CardTitle>
              <DoorOpen className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.overview?.totalRooms || 0}</div>
              <p className='text-xs text-muted-foreground'>Available rooms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Today&apos;s Meetings</CardTitle>
              <Calendar className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.overview?.totalReservationsToday || 0}</div>
              <p className='text-xs text-muted-foreground'>
                {data.overview?.currentMeetings || 0} in progress, {data.overview?.upcomingMeetingsToday || 0} upcoming
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Room Utilization</CardTitle>
              <BarChart3 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{data.overview?.roomUtilizationRate || 0}%</div>
              <p className='text-xs text-muted-foreground'>Rooms used today</p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <TrendingUp className='mr-2 h-5 w-5' />
                Monthly Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>This Week</span>
                  <span className='font-medium'>{data.overview?.totalReservationsThisWeek || 0} meetings</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>This Month</span>
                  <span className='font-medium'>{data.overview?.totalReservationsThisMonth || 0} meetings</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Daily Average</span>
                  <span className='font-medium'>{data.overview?.averageReservationsPerDay || 0} meetings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <CalendarDays className='mr-2 h-5 w-5' />
                Calendar Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Total Connections</span>
                  <span className='font-medium'>{data.calendarIntegration?.totalConnections || 0}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Active Connections</span>
                  <span className='font-medium'>{data.calendarIntegration?.activeConnections || 0}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-muted-foreground'>Sync Success Rate</span>
                  <Badge variant={(data.calendarIntegration?.syncSuccessRate || 0) > 80 ? "default" : "destructive"}>
                    {data.calendarIntegration?.syncSuccessRate || 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Room Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <Activity className='mr-2 h-5 w-5' />
                Top Room Utilization Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.roomUtilization || data.roomUtilization.length === 0 ? (
                <p className='text-center text-muted-foreground py-4'>
                  No room usage data for today
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Usage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.roomUtilization.map((room, index) => (
                      <TableRow key={index}>
                        <TableCell className='font-medium'>{room.roomName || 'Unknown Room'}</TableCell>
                        <TableCell>{room.buildingName || 'Unknown Building'}</TableCell>
                        <TableCell>
                          <div className='flex items-center space-x-2'>
                            <span className='text-sm'>{room.utilizationPercentage || 0}%</span>
                            <Badge variant='outline' className='text-xs'>
                              {room.totalDuration || 0}h
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <Clock className='mr-2 h-5 w-5' />
                Recent Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.recentActivity || data.recentActivity.length === 0 ? (
                <p className='text-center text-muted-foreground py-4'>
                  No recent reservations
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meeting</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentActivity.map((reservation) => (
                      <TableRow key={reservation._id}>
                        <TableCell>
                          <div>
                            <div className='font-medium text-sm'>{reservation.title || 'Untitled Meeting'}</div>
                            <div className='text-xs text-muted-foreground'>{reservation.organizer || 'Unknown Organizer'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className='text-sm'>{reservation.room_id?.name || 'Unknown Room'}</div>
                            <div className='text-xs text-muted-foreground'>
                              {reservation.room_id?.building_id?.name || 'Unknown Building'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='text-sm'>
                            {formatDate(reservation.start_time)}
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Building Statistics */}
        {data.buildingStats && data.buildingStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <Building className='mr-2 h-5 w-5' />
                Building Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building</TableHead>
                    <TableHead>Reservations</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.buildingStats.map((building, index) => (
                    <TableRow key={index}>
                      <TableCell className='font-medium'>{building.buildingName || 'Unknown Building'}</TableCell>
                      <TableCell>{building.reservationCount || 0}</TableCell>
                      <TableCell>
                        <div className='w-full bg-muted rounded-full h-2'>
                          <div
                            className='bg-primary h-2 rounded-full'
                            style={{
                              width: `${Math.min(
                                ((building.reservationCount || 0) / Math.max(...data.buildingStats.map(b => b.reservationCount || 0), 1)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Frame>
  );
};

export default DashboardPage;
