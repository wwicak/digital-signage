import React, { useEffect, useRef, memo, useState } from 'react'
import { Layout, Plus, Monitor, Eye, Edit, Trash2, Copy } from 'lucide-react'
import Link from 'next/link'

import Frame from '../components/Admin/Frame'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import DisplayStatusCard from '../components/Admin/DisplayStatusCard'

import { protect, ProtectProps } from '../helpers/auth'
import { useDisplays } from '../hooks/useDisplays'

interface LayoutsProps extends ProtectProps {}

// Mock layout data - in real implementation, this would come from a layouts API
const mockLayouts = [
  {
    id: 'layout-1',
    name: 'Corporate Announcements',
    description: 'General corporate communications and announcements',
    widgets: ['announcement', 'clock', 'weather'],
    orientation: 'landscape',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    isActive: true,
  },
  {
    id: 'layout-2', 
    name: 'Meeting Room Display',
    description: 'Room booking and meeting information',
    widgets: ['calendar', 'clock', 'room-status'],
    orientation: 'portrait',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    isActive: true,
  },
  {
    id: 'layout-3',
    name: 'Lobby Information',
    description: 'Welcome messages and general information',
    widgets: ['slideshow', 'weather', 'news'],
    orientation: 'landscape',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
    isActive: false,
  },
];

const LayoutsComponent = memo(function LayoutsComponent({ loggedIn }: LayoutsProps) {
  const [layouts, setLayouts] = useState(mockLayouts);

  const handleCreateLayout = () => {
    // Navigate to layout creation/editor
    window.location.href = '/layout-admin';
  };

  const handleEditLayout = (layoutId: string) => {
    window.location.href = `/layout-admin?id=${layoutId}`;
  };

  const handleViewLayout = (layoutId: string) => {
    window.location.href = `/layout?display=${layoutId}`;
  };

  const handleDuplicateLayout = (layoutId: string) => {
    const originalLayout = layouts.find(l => l.id === layoutId);
    if (originalLayout) {
      const newLayout = {
        ...originalLayout,
        id: `layout-${Date.now()}`,
        name: `${originalLayout.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setLayouts([...layouts, newLayout]);
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    if (layout && window.confirm(`Are you sure you want to delete "${layout.name}"?`)) {
      setLayouts(layouts.filter(l => l.id !== layoutId));
    }
  };

  return (
    <Frame loggedIn={loggedIn}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Layout Templates</h1>
            <p className="text-muted-foreground">
              Create and manage layout templates for your digital signage displays.
            </p>
          </div>
          <Button
            onClick={handleCreateLayout}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Layout
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Layouts</CardTitle>
              <Layout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{layouts.length}</div>
              <p className="text-xs text-muted-foreground">
                {layouts.filter(l => l.isActive).length} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Displays</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Displays using these layouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {layouts.filter(l => {
                  const dayAgo = new Date();
                  dayAgo.setDate(dayAgo.getDate() - 1);
                  return l.updatedAt > dayAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Updated in last 24h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Layouts Grid */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Your Layouts</h2>
          
          {layouts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Layout className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No layouts created yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first layout template to get started with digital signage.
                </p>
                <Button onClick={handleCreateLayout}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Layout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {layouts.map((layout) => (
                <Card key={layout.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{layout.name}</CardTitle>
                      <Badge variant={layout.isActive ? "default" : "secondary"}>
                        {layout.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{layout.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Widgets:</span>
                        <span className="font-medium">{layout.widgets.length}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Orientation:</span>
                        <span className="font-medium capitalize">{layout.orientation}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium">
                          {layout.updatedAt.toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLayout(layout.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLayout(layout.id)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateLayout(layout.id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLayout(layout.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Display URL for physical devices */}
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Display URL:
                        </p>
                        <code className="text-xs bg-background px-2 py-1 rounded border">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/display?layout={layout.id}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Open this URL on your display device
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Connected Displays Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Connected Displays</h2>
          <DisplayStatusCard 
            title="Displays Using Your Layouts"
            showLayoutInfo={true}
            className="w-full"
          />
        </div>
      </div>
    </Frame>
  )
})

// Create a wrapper component for getInitialProps
const Layouts = (props: LayoutsProps) => <LayoutsComponent {...props} />

export default protect(Layouts)
