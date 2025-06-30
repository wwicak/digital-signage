'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Monitor,
  Settings,
  Layout,
  Eye,
  RefreshCw,
  Activity,
  Zap,
  Clock,
  Tv,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IDisplayConfigSidebarProps {
  selectedDisplay?: {
    _id: string
    name: string
    layout?: {
      _id: string
      name: string
    }
    status?: 'online' | 'offline' | 'maintenance'
    lastSeen?: string
    settings?: {
      brightness?: number
      orientation?: 'landscape' | 'portrait'
      refreshRate?: number
    }
  }
  onRefreshDisplay?: (displayId: string) => void
  onPreviewDisplay?: (displayId: string) => void
  onEditLayout?: (displayId: string) => void
  onDisplaySettings?: (displayId: string) => void
  className?: string
}

const DisplayConfigSidebar: React.FC<IDisplayConfigSidebarProps> = ({
  selectedDisplay,
  onRefreshDisplay,
  onPreviewDisplay,
  onEditLayout,
  onDisplaySettings,
  className
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Monitor className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'offline':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!selectedDisplay) {
    return (
      <Card className={cn('h-fit', className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Display Selected</h3>
            <p className="text-muted-foreground text-sm">
              Select a display from the main panel to view its configuration options and controls.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Display Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tv className="h-5 w-5" />
            Display Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-base mb-2">{selectedDisplay.name}</h4>
            <div className="flex items-center gap-2 mb-3">
              {getStatusIcon(selectedDisplay.status)}
              <Badge 
                variant="outline" 
                className={cn('text-xs font-medium truncate max-w-[120px]', getStatusColor(selectedDisplay.status))}
              >
                {selectedDisplay.status?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
            
            {selectedDisplay.lastSeen && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last seen: {new Date(selectedDisplay.lastSeen).toLocaleString()}
              </div>
            )}
          </div>

          <Separator />

          {/* Current Layout */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layout className="h-4 w-4" />
              <span className="font-medium text-sm">Current Layout</span>
            </div>
            {selectedDisplay.layout ? (
              <p className="text-sm text-muted-foreground pl-6">
                {selectedDisplay.layout.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-6">
                No layout assigned
              </p>
            )}
          </div>

          {/* Display Settings */}
          {selectedDisplay.settings && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium text-sm">Settings</span>
                </div>
                <div className="space-y-1 pl-6 text-sm text-muted-foreground">
                  {selectedDisplay.settings.brightness && (
                    <div className="flex justify-between">
                      <span>Brightness:</span>
                      <span>{selectedDisplay.settings.brightness}%</span>
                    </div>
                  )}
                  {selectedDisplay.settings.orientation && (
                    <div className="flex justify-between">
                      <span>Orientation:</span>
                      <span className="capitalize">{selectedDisplay.settings.orientation}</span>
                    </div>
                  )}
                  {selectedDisplay.settings.refreshRate && (
                    <div className="flex justify-between">
                      <span>Refresh Rate:</span>
                      <span>{selectedDisplay.settings.refreshRate}Hz</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onPreviewDisplay?.(selectedDisplay._id)}
          >
            <Eye className="h-4 w-4" />
            Preview Display
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onEditLayout?.(selectedDisplay._id)}
          >
            <Layout className="h-4 w-4" />
            Edit Layout
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onDisplaySettings?.(selectedDisplay._id)}
          >
            <Settings className="h-4 w-4" />
            Display Settings
          </Button>
          
          <Separator />
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onRefreshDisplay?.(selectedDisplay._id)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Display
          </Button>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedDisplay.status)}
                <span className="text-sm text-muted-foreground">
                  {selectedDisplay.status === 'online' ? 'Connected' : 
                   selectedDisplay.status === 'offline' ? 'Disconnected' : 
                   'Maintenance Mode'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Layout</span>
              <span className="text-sm text-muted-foreground">
                {selectedDisplay.layout ? 'Assigned' : 'Not Assigned'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Configuration</span>
              <span className="text-sm text-muted-foreground">
                {selectedDisplay.settings ? 'Configured' : 'Default'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DisplayConfigSidebar