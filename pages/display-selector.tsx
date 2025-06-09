import React, { useState, useEffect } from 'react'
import { Monitor, Layout, Play, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// This page is designed to be opened on physical display devices
// It allows users to select which layout to show on the current display

interface Layout {
  id: string;
  name: string;
  description: string;
  widgets: string[];
  orientation: 'landscape' | 'portrait';
  isActive: boolean;
  previewUrl?: string;
}

// Mock layout data - in real implementation, this would come from layouts API
const mockLayouts: Layout[] = [
  {
    id: 'layout-1',
    name: 'Corporate Announcements',
    description: 'General corporate communications and announcements',
    widgets: ['announcement', 'clock', 'weather'],
    orientation: 'landscape',
    isActive: true,
  },
  {
    id: 'layout-2', 
    name: 'Meeting Room Display',
    description: 'Room booking and meeting information',
    widgets: ['calendar', 'clock', 'room-status'],
    orientation: 'portrait',
    isActive: true,
  },
  {
    id: 'layout-3',
    name: 'Lobby Information',
    description: 'Welcome messages and general information',
    widgets: ['slideshow', 'weather', 'news'],
    orientation: 'landscape',
    isActive: true,
  },
];

export default function DisplaySelector() {
  const router = useRouter();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    screenResolution: '',
    ipAddress: 'Detecting...',
  });

  useEffect(() => {
    // Simulate loading layouts
    setTimeout(() => {
      setLayouts(mockLayouts.filter(l => l.isActive));
      setIsLoading(false);
    }, 1000);

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

  const handleLayoutSelect = (layoutId: string) => {
    setSelectedLayout(layoutId);
  };

  const handleStartDisplay = () => {
    if (selectedLayout) {
      // Navigate to the display page with the selected layout
      router.push(`/display?layout=${selectedLayout}&autostart=true`);
    }
  };

  const handlePreview = (layoutId: string) => {
    // Open preview in a new window
    window.open(`/layout?display=${layoutId}&preview=true`, '_blank');
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {layouts.map((layout) => (
                <Card 
                  key={layout.id} 
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg",
                    selectedLayout === layout.id 
                      ? "ring-2 ring-blue-500 bg-blue-50" 
                      : "hover:shadow-md"
                  )}
                  onClick={() => handleLayoutSelect(layout.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{layout.name}</CardTitle>
                      {selectedLayout === layout.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{layout.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Widgets:</span>
                        <span className="font-medium">{layout.widgets.length}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Orientation:</span>
                        <span className="font-medium capitalize">{layout.orientation}</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(layout.id);
                          }}
                          className="flex-1"
                        >
                          Preview
                        </Button>
                        
                        <Button
                          variant={selectedLayout === layout.id ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLayoutSelect(layout.id);
                          }}
                          className="flex-1"
                        >
                          {selectedLayout === layout.id ? "Selected" : "Select"}
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
                      Layout "{layouts.find(l => l.id === selectedLayout)?.name}" selected
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
