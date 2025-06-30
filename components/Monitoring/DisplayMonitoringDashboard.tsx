import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  RefreshCw,
  Bell,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useDisplayStatus } from "@/hooks/useDisplayStatus";

interface DisplayMonitoringDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const DisplayMonitoringDashboard: React.FC<DisplayMonitoringDashboardProps> = ({
  className = "",
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [selectedDisplays, setSelectedDisplays] = useState<string[]>([]);
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const {
    displayStatus,
    monitoringStats,
    lastUpdateTime,
    getDisplayStatus,
    isDisplayOnline,
    getOfflineDisplays,
    getOnlineDisplays,
    getDisplaysWithAlerts,
    getTotalUptimePercentage,
    refreshStatus,
    isLoadingStats,
    statsError,
    isSSEConnected,
  } = useDisplayStatus({
    enableRealTimeUpdates: autoRefresh,
    refreshInterval,
  });

  const offlineDisplays = getOfflineDisplays();
  const onlineDisplays = getOnlineDisplays();
  const displaysWithAlerts = getDisplaysWithAlerts();

  // Filter displays based on current view
  const getFilteredDisplays = () => {
    let displays = Object.keys(displayStatus);
    
    if (showOfflineOnly) {
      displays = displays.filter(id => !isDisplayOnline(id));
    }
    
    if (showAlertsOnly) {
      displays = displays.filter(id => {
        const status = getDisplayStatus(id);
        return status.alertCount && status.alertCount > 0;
      });
    }
    
    return displays;
  };

  const filteredDisplays = getFilteredDisplays();

  const getStatusBadge = (displayId: string) => {
    const isOnline = isDisplayOnline(displayId);
    
    if (isOnline) {
      return (
        <Badge variant='default' className='bg-green-100 text-green-800 border-green-200'>
          <CheckCircle className='w-3 h-3 mr-1' />
          Online
        </Badge>
      );
    } else {
      return (
        <Badge variant='destructive'>
          <WifiOff className='w-3 h-3 mr-1' />
          Offline
        </Badge>
      );
    }
  };

  const getLastSeenText = (displayId: string) => {
    const status = getDisplayStatus(displayId);
    if (!status.lastSeen) return "Never";
    
    const now = new Date();
    const lastSeen = status.lastSeen;
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatUptime = (percentage?: number) => {
    if (percentage === undefined) return "N/A";
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Display Monitoring</h2>
          <p className='text-muted-foreground'>
            Real-time status and health monitoring for all displays
          </p>
        </div>
        <div className='flex items-center space-x-2'>
          <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
            <div className={`w-2 h-2 rounded-full ${isSSEConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isSSEConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <span className='text-sm text-muted-foreground'>
            Updated: {lastUpdateTime.toLocaleTimeString()}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={refreshStatus}
            disabled={isLoadingStats}
          >
            {isLoadingStats ? (
              <RefreshCw className='h-4 w-4 animate-spin' />
            ) : (
              <RefreshCw className='h-4 w-4' />
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {statsError && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load monitoring data. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Displays</CardTitle>
            <Monitor className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {monitoringStats?.displays?.total || Object.keys(displayStatus).length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Registered displays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Online</CardTitle>
            <Wifi className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {monitoringStats?.displays?.online || onlineDisplays.length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Currently connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Offline</CardTitle>
            <WifiOff className='h-4 w-4 text-red-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {monitoringStats?.displays?.offline || offlineDisplays.length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Disconnected displays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Uptime</CardTitle>
            <TrendingUp className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {formatUptime(monitoringStats?.displays?.uptimePercentage || getTotalUptimePercentage())}
            </div>
            <p className='text-xs text-muted-foreground'>
              Overall uptime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {displaysWithAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <AlertTriangle className='mr-2 h-5 w-5 text-orange-500' />
              Active Alerts ({displaysWithAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {displaysWithAlerts.slice(0, 5).map(displayId => {
                const status = getDisplayStatus(displayId);
                return (
                  <div key={displayId} className='flex items-center justify-between p-2 bg-orange-50 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <AlertTriangle className='h-4 w-4 text-orange-500' />
                      <span className='font-medium'>Display {displayId}</span>
                      <Badge variant='outline'>{status.alertCount} alerts</Badge>
                    </div>
                    <span className='text-sm text-muted-foreground'>
                      {getLastSeenText(displayId)}
                    </span>
                  </div>
                );
              })}
              {displaysWithAlerts.length > 5 && (
                <p className='text-sm text-muted-foreground text-center'>
                  And {displaysWithAlerts.length - 5} more displays with alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <div className='flex items-center space-x-4'>
        <Button
          variant={showOfflineOnly ? "default" : "outline"}
          size='sm'
          onClick={() => setShowOfflineOnly(!showOfflineOnly)}
        >
          <WifiOff className='w-4 h-4 mr-2' />
          Offline Only ({offlineDisplays.length})
        </Button>
        <Button
          variant={showAlertsOnly ? "default" : "outline"}
          size='sm'
          onClick={() => setShowAlertsOnly(!showAlertsOnly)}
        >
          <Bell className='w-4 h-4 mr-2' />
          With Alerts ({displaysWithAlerts.length})
        </Button>
      </div>

      {/* Display Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>Display Status ({filteredDisplays.length})</span>
            <div className='flex items-center space-x-2'>
              {selectedDisplays.length > 0 && (
                <Badge variant='outline'>
                  {selectedDisplays.length} selected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDisplays.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              {showOfflineOnly ? "No offline displays" :
               showAlertsOnly ? "No displays with alerts" :
               "No displays found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedDisplays.length === filteredDisplays.length && filteredDisplays.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDisplays([...filteredDisplays]);
                        } else {
                          setSelectedDisplays([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Display</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisplays.map(displayId => {
                  const status = getDisplayStatus(displayId);
                  const isOnline = isDisplayOnline(displayId);

                  return (
                    <TableRow key={displayId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedDisplays.includes(displayId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDisplays([...selectedDisplays, displayId]);
                            } else {
                              setSelectedDisplays(selectedDisplays.filter(id => id !== displayId));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <Monitor className='h-4 w-4' />
                          <div>
                            <div className='font-medium'>Display {displayId}</div>
                            {status.ipAddress && (
                              <div className='text-sm text-muted-foreground'>
                                {status.ipAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(displayId)}
                        {status.consecutiveFailures > 0 && (
                          <div className='text-xs text-red-600 mt-1'>
                            {status.consecutiveFailures} failures
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className='flex items-center space-x-1'>
                          <Clock className='h-3 w-3 text-muted-foreground' />
                          <span>{getLastSeenText(displayId)}</span>
                        </div>
                        {status.disconnectionReason && !isOnline && (
                          <div className='text-xs text-muted-foreground mt-1'>
                            Reason: {status.disconnectionReason}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className='flex items-center space-x-1'>
                          <Activity className='h-3 w-3 text-muted-foreground' />
                          <span>{formatUptime(status.uptimePercentage)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className='text-sm'>
                          {status.connectionType || 'Unknown'}
                        </div>
                        {status.responseTime && (
                          <div className='text-xs text-muted-foreground'>
                            {status.responseTime}ms
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {status.alertCount && status.alertCount > 0 ? (
                          <Badge variant='destructive' className='text-xs'>
                            <AlertTriangle className='w-3 h-3 mr-1' />
                            {status.alertCount}
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='text-xs'>
                            <CheckCircle className='w-3 h-3 mr-1' />
                            None
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className='flex items-center space-x-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => refreshStatus()}
                          >
                            <RefreshCw className='h-3 w-3' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => console.log('View details for', displayId)}
                          >
                            <Settings className='h-3 w-3' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DisplayMonitoringDashboard;
