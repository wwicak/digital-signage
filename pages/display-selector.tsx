import React, { useState, useEffect } from 'react'
import { Monitor, Layout, Play, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useActiveLayoutTemplates } from '../hooks/useLayouts'
import { ILayoutData } from '../actions/layouts'

// This page is designed to be opened on physical display devices
// It allows users to select which layout to show on the current display

export default function DisplaySelector() {
  const router = useRouter();
  const { data: layoutsResponse, isLoading, error, refetch } = useActiveLayoutTemplates();
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    screenResolution: '',
    ipAddress: 'Detecting...',
  });

  // Check if a specific layout was requested via URL parameter
  useEffect(() => {
    const { layout } = router.query;
    if (layout && typeof layout === 'string') {
      setSelectedLayout(layout);
    }
  }, [router.query]);

  useEffect(() => {
    // Get device information
    setDeviceInfo({
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      ipAddress: 'Detecting...',
    });

    // Try to get IP address (simplified)
    fetch('/api/system/status')
      .then(res => res.json())
      .then(data => {
        // This would include IP detection logic
        setDeviceInfo(prev => ({ ...prev, ipAddress: 'Auto-detected' }));
      })
      .catch(() => {
        setDeviceInfo(prev => ({ ...prev, ipAddress: 'Unable to detect' }));
      });
  }, []);

  const layouts = layoutsResponse?.layouts || [];

  const handleLayoutSelect = (layoutId: string) => {
    setSelectedLayout(layoutId);
  };

  const handleStartDisplay = () => {
    if (selectedLayout) {
      // Navigate to the display page with the selected layout
      // This will auto-register the display with the admin panel
      router.push(`/display?layout=${selectedLayout}&autostart=true`);
    }
  };

  const handlePreview = (layoutId: string) => {
    // Open preview in a new window
    window.open(`/layout-preview?id=${layoutId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Monitor className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Digital Display Setup</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a layout template to display on this screen. The display will automatically 
            register with the admin panel and begin showing your selected content.
          </p>
        </div>

        {/* Device Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wifi className="h-5 w-5 mr-2" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Screen Resolution:</span>
                <p className="text-gray-900">{deviceInfo.screenResolution}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">IP Address:</span>
                <p className="text-gray-900">{deviceInfo.ipAddress}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Status:</span>
                <Badge variant="default" className="ml-1">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Layout className="h-6 w-6 mr-2" />
            Choose Your Layout
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-red-600 mb-4">
                  <h3 className="text-lg font-semibold mb-2">Error loading layouts</h3>
                  <p className="text-sm">{error.message}</p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : layouts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Layout className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No layouts available</h3>
                <p className="text-gray-600 mb-4">
                  No active layout templates are available. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {layouts.map((layout: any) => (
                <Card
                  key={layout._id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg",
                    selectedLayout === layout._id
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : "hover:shadow-md"
                  )}
                  onClick={() => handleLayoutSelect(layout._id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{layout.name}</CardTitle>
                      {selectedLayout === layout._id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{layout.description || 'No description'}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Widgets:</span>
                        <span className="font-medium">{Array.isArray(layout.widgets) ? layout.widgets.length : 0}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Orientation:</span>
                        <span className="font-medium capitalize">{layout.orientation}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Layout Type:</span>
                        <span className="font-medium capitalize">{layout.layoutType}</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(layout._id as string);
                          }}
                          className="flex-1"
                        >
                          Preview
                        </Button>

                        <Button
                          variant={selectedLayout === layout._id ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLayoutSelect(layout._id as string);
                          }}
                          className="flex-1"
                        >
                          {selectedLayout === layout._id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Start Display Button */}
        {selectedLayout && (
          <div className="text-center">
            <Card className="inline-block p-6 bg-green-50 border-green-200">
              <CardContent className="p-0">
                <div className="flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Ready to Start</h3>
                    <p className="text-sm text-green-700">
                      Layout "{layouts.find((l: any) => l._id === selectedLayout)?.name}" selected
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartDisplay}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Display
                </Button>
                
                <p className="text-xs text-green-600 mt-2">
                  This display will automatically register with the admin panel
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>1.</strong> Select a layout template from the options above</p>
              <p><strong>2.</strong> Click "Start Display" to begin showing content</p>
              <p><strong>3.</strong> This display will automatically appear in the admin panel</p>
              <p><strong>4.</strong> Administrators can monitor and manage this display remotely</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
