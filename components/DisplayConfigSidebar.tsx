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
import { IDisplayWithLayout } from '@/hooks/useDisplaysWithLayouts'

interface IDisplayConfigSidebarProps {
  selectedDisplay?: IDisplayWithLayout | null
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
  const getStatusIcon = (isOnline?: boolean) => {
    if (isOnline) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (isOnline?: boolean) => {
    if (isOnline) {
      return 'bg-green-100 text-green-700 border-green-200'
    } else {
      return 'bg-red-100 text-red-700 border-red-200'
    }
  }

  const getStatusText = (isOnline?: boolean) => {
    return isOnline ? 'ONLINE' : 'OFFLINE'
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
              {getStatusIcon(selectedDisplay.isOnline)}
              <Badge
                variant="outline"
                className={cn('text-xs font-medium truncate max-w-[120px]', getStatusColor(selectedDisplay.isOnline))}
              >
                {getStatusText(selectedDisplay.isOnline)}
              </Badge>
            </div>

            {selectedDisplay.last_update && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last seen: {new Date(selectedDisplay.last_update).toLocaleString()}
              </div>
            )}

            {selectedDisplay.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Monitor className="h-4 w-4" />
                Location: {selectedDisplay.location}
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
                {selectedDisplay.layoutName || 'Unknown Layout'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-6">
                No layout assigned
              </p>
            )}
          </div>

          {/* Display Details */}
          {(selectedDisplay.building || selectedDisplay.created_at) && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium text-sm">Details</span>
                </div>
                <div className="space-y-1 pl-6 text-sm text-muted-foreground">
                  {selectedDisplay.building && (
                    <div className="flex justify-between">
                      <span>Building:</span>
                      <span>{selectedDisplay.building}</span>
                    </div>
                  )}
                  {selectedDisplay.created_at && (
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{new Date(selectedDisplay.created_at).toLocaleDateString()}</span>
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
                {getStatusIcon(selectedDisplay.isOnline)}
                <span className="text-sm text-muted-foreground">
                  {selectedDisplay.isOnline ? 'Connected' : 'Disconnected'}
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
                {selectedDisplay.updated_at ? 'Configured' : 'Default'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DisplayConfigSidebar