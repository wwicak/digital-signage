import React, { useState } from 'react';
import { Layout, Monitor, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RemoteLayoutChangerProps {
  displayId: string;
  displayName: string;
  currentLayout: string;
  isOnline: boolean;
  onLayoutChanged?: (newLayoutId: string) => void;
  className?: string;
}

// Mock layout data - in real implementation, this would come from layouts API
const availableLayouts = [
  { id: 'layout-1', name: 'Corporate Announcements', description: 'General corporate communications' },
  { id: 'layout-2', name: 'Meeting Room Display', description: 'Room booking and meeting information' },
  { id: 'layout-3', name: 'Lobby Information', description: 'Welcome messages and general information' },
  { id: 'layout-4', name: 'Emergency Alerts', description: 'Emergency notifications and alerts' },
  { id: 'layout-5', name: 'Digital Menu Board', description: 'Restaurant menu and pricing' },
];

export const RemoteLayoutChanger: React.FC<RemoteLayoutChangerProps> = ({
  displayId,
  displayName,
  currentLayout,
  isOnline,
  onLayoutChanged,
  className,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<string>(currentLayout);
  const [isChanging, setIsChanging] = useState(false);
  const [changeStatus, setChangeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleLayoutChange = async () => {
    if (!selectedLayout || selectedLayout === currentLayout) {
      return;
    }

    setIsChanging(true);
    setChangeStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/v1/displays/${displayId}/change-layout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layoutId: selectedLayout,
          immediate: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change layout');
      }

      const data = await response.json();
      setChangeStatus('success');
      
      // Call the callback if provided
      if (onLayoutChanged) {
        onLayoutChanged(selectedLayout);
      }

      // Auto-clear success status after 3 seconds
      setTimeout(() => {
        setChangeStatus('idle');
      }, 3000);

    } catch (error: unknown) {
      console.error('Error changing layout:', error);
      setChangeStatus('error');
      setErrorMessage(error.message || 'Failed to change layout');
    } finally {
      setIsChanging(false);
    }
  };

  const getCurrentLayoutName = () => {
    const layout = availableLayouts.find(l => l.id === currentLayout);
    return layout?.name || currentLayout;
  };

  const getSelectedLayoutName = () => {
    const layout = availableLayouts.find(l => l.id === selectedLayout);
    return layout?.name || selectedLayout;
  };

  const hasChanges = selectedLayout !== currentLayout;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Layout className='h-5 w-5' />
          Remote Layout Control
        </CardTitle>
        <div className='flex items-center gap-2'>
          <Monitor className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm text-muted-foreground'>{displayName}</span>
          <Badge variant={isOnline ? "default" : "destructive"} className='text-xs'>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Current Layout Info */}
        <div className='p-3 bg-muted/30 rounded-lg'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Current Layout</p>
              <p className='text-xs text-muted-foreground'>{getCurrentLayoutName()}</p>
            </div>
            <Badge variant='outline' className='text-xs'>
              Active
            </Badge>
          </div>
        </div>

        {/* Layout Selection */}
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Change to Layout</label>
          <Select
            value={selectedLayout}
            onValueChange={setSelectedLayout}
            disabled={!isOnline || isChanging}
          >
            <SelectTrigger>
              <SelectValue placeholder='Select a layout' />
            </SelectTrigger>
            <SelectContent>
              {availableLayouts.map((layout) => (
                <SelectItem key={layout.id} value={layout.id}>
                  <div className='flex flex-col'>
                    <span className='font-medium'>{layout.name}</span>
                    <span className='text-xs text-muted-foreground'>{layout.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Messages */}
        {!isOnline && (
          <Alert>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              Display is offline. Layout changes will be applied when the display comes back online.
            </AlertDescription>
          </Alert>
        )}

        {changeStatus === 'success' && (
          <Alert className='border-green-200 bg-green-50'>
            <Check className='h-4 w-4 text-green-600' />
            <AlertDescription className='text-green-800'>
              Layout change request sent successfully! The display should update shortly.
            </AlertDescription>
          </Alert>
        )}

        {changeStatus === 'error' && (
          <Alert className='border-red-200 bg-red-50'>
            <AlertTriangle className='h-4 w-4 text-red-600' />
            <AlertDescription className='text-red-800'>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className='flex gap-2 pt-2'>
          <Button
            onClick={handleLayoutChange}
            disabled={!hasChanges || isChanging || !isOnline}
            className='flex-1'
          >
            {isChanging ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Changing Layout...
              </>
            ) : (
              <>
                <RefreshCw className='h-4 w-4 mr-2' />
                Apply Layout Change
              </>
            )}
          </Button>

          {hasChanges && (
            <Button
              variant='outline'
              onClick={() => setSelectedLayout(currentLayout)}
              disabled={isChanging}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Preview Info */}
        {hasChanges && (
          <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg'>
            <p className='text-sm font-medium text-blue-900'>Preview Change</p>
            <p className='text-xs text-blue-700 mt-1'>
              <span className='font-medium'>{getCurrentLayoutName()}</span>
              {' → '}
              <span className='font-medium'>{getSelectedLayoutName()}</span>
            </p>
            <p className='text-xs text-blue-600 mt-2'>
              The display will automatically reload with the new layout when you apply the change.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className='text-xs text-muted-foreground space-y-1'>
          <p><strong>How it works:</strong></p>
          <ul className='list-disc list-inside space-y-1 ml-2'>
            <li>Select a new layout from the dropdown above</li>
            <li>Click &quot;Apply Layout Change&quot; to send the command</li>
            <li>The display will automatically reload with the new layout</li>
            <li>Changes are applied immediately for online displays</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RemoteLayoutChanger;
