import React, { useEffect, useRef, memo, useState } from 'react'
import { Layout, Plus, Monitor, Eye, Edit, Trash2, Copy, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Frame from '../components/Admin/Frame'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import DisplayStatusCard from '../components/Admin/DisplayStatusCard'

import { protect, ProtectProps } from '../helpers/auth'
import { useLayouts } from '../hooks/useLayouts'
import { useLayoutMutations } from '../hooks/useLayoutMutations'
import { ILayoutQueryParams } from '../actions/layouts'

interface LayoutsProps extends ProtectProps {}

const LayoutsComponent = memo(function LayoutsComponent({ loggedIn }: LayoutsProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [orientationFilter, setOrientationFilter] = useState<'all' | 'landscape' | 'portrait'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Build query parameters
  const queryParams: ILayoutQueryParams = {
    search: searchTerm || undefined,
    orientation: orientationFilter !== 'all' ? orientationFilter : undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    limit: 20,
  }

  const { data: layoutsResponse, isLoading, error, refetch } = useLayouts(queryParams)
  const { deleteLayout, duplicateLayout, isDeleting, isDuplicating } = useLayoutMutations()

  // Extract layouts array from response
  const layouts = layoutsResponse?.layouts || []

  const handleCreateLayout = () => {
    // Navigate to layout creation/editor without requiring display ID
    router.push('/layout-admin');
  };

  const handleEditLayout = (layoutId: string) => {
    router.push(`/layout-admin?id=${layoutId}`);
  };

  const handleViewLayout = (layoutId: string) => {
    // Preview the layout - we'll create a preview route that doesn't require display
    router.push(`/layout-preview?id=${layoutId}`);
  };

  const handleDuplicateLayout = (layoutId: string) => {
    const layout = layouts.find((l: any) => l._id === layoutId);
    if (layout) {
      const newName = `${layout.name} (Copy)`;
      duplicateLayout({ id: layoutId, newName });
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    const layout = layouts.find((l: any) => l._id === layoutId);
    if (layout && window.confirm(`Are you sure you want to delete "${layout.name}"?`)) {
      deleteLayout(layoutId);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
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
              <div className="text-2xl font-bold">
                {isLoading ? '...' : layoutsResponse?.pagination.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? '...' : layouts.filter((l: any) => l.isActive).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Displays</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : layouts.reduce((total: number, layout: any) => total + (layout.displays?.length || 0), 0)}
              </div>
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
                {isLoading ? '...' : layouts.filter((l: any) => {
                  const dayAgo = new Date();
                  dayAgo.setDate(dayAgo.getDate() - 1);
                  return new Date(l.last_update) > dayAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Updated in last 24h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search layouts..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            <Select value={orientationFilter} onValueChange={(value: any) => setOrientationFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orientations</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layouts</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layouts Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Layouts</h2>
            {layoutsResponse?.pagination && (
              <p className="text-sm text-muted-foreground">
                Showing {layouts.length} of {layoutsResponse.pagination.total} layouts
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-destructive mb-4">
                  <h3 className="text-lg font-semibold mb-2">Error loading layouts</h3>
                  <p className="text-sm">{error.message}</p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : layouts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Layout className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No layouts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || orientationFilter !== 'all' || statusFilter !== 'all'
                    ? "No layouts match your current filters. Try adjusting your search criteria."
                    : "Create your first layout template to get started with digital signage."
                  }
                </p>
                <Button onClick={handleCreateLayout}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Layout
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {layouts.map((layout: any) => (
                <Card key={layout._id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{layout.name}</CardTitle>
                      <Badge variant={layout.isActive ? "default" : "secondary"}>
                        {layout.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{layout.description || 'No description'}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Widgets:</span>
                        <span className="font-medium">{Array.isArray(layout.widgets) ? layout.widgets.length : 0}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Orientation:</span>
                        <span className="font-medium capitalize">{layout.orientation}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Layout Type:</span>
                        <span className="font-medium capitalize">{layout.layoutType}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Displays:</span>
                        <span className="font-medium">{layout.displays?.length || 0}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="font-medium">
                          {new Date(layout.last_update).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLayout(layout._id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditLayout(layout._id)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateLayout(layout._id)}
                          disabled={isDuplicating}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {isDuplicating ? 'Copying...' : 'Copy'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteLayout(layout._id)}
                          disabled={isDeleting}
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
                        <code className="text-xs bg-background px-2 py-1 rounded border break-all">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/display-selector?layout={layout._id}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Open this URL on your display device to auto-register and show this layout
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
