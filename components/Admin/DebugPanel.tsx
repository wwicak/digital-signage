import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import {
  Bug,
  Database,
  User,
  Palette,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

/**
 * Debug panel to help diagnose issues with the Frame component improvements
 */
const DebugPanel: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkSystemStatus();
    checkAuthStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await fetch("/api/system/status");
      const data = await response.json();
      setSystemStatus({ status: response.status, data });
    } catch (error: any) {
      setSystemStatus({ error: error.message });
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();
      setAuthStatus({ status: response.status, data });
    } catch (error: any) {
      setAuthStatus({ error: error.message });
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([checkSystemStatus(), checkAuthStatus()]);
    setLoading(false);
  };

  const testThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <Card>
        <CardContent className='p-6'>
          <div className='flex items-center justify-center'>
            <RefreshCw className='w-4 h-4 animate-spin mr-2' />
            Loading debug panel...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bug className='w-5 h-5' />
            Debug Panel
            <Button
              variant='outline'
              size='sm'
              onClick={refreshAll}
              disabled={loading}
              className='ml-auto'
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Theme Status */}
          <div>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Palette className='w-4 h-4' />
              Theme Status
            </h3>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Current Theme:</span>
                  <Badge variant='outline'>{theme || "undefined"}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Resolved Theme:</span>
                  <Badge variant='outline'>{resolvedTheme || "undefined"}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm'>Mounted:</span>
                  <Badge variant={mounted ? "default" : "destructive"}>
                    {mounted ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              <div className='space-y-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={testThemeToggle}
                  className='w-full'
                >
                  Toggle Theme (Test)
                </Button>
                <div className='p-3 rounded border bg-background text-foreground'>
                  <p className='text-xs'>
                    This box should change colors when theme toggles.
                    Current: {resolvedTheme}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Database className='w-4 h-4' />
              System Status API
            </h3>
            <div className='space-y-2'>
              {systemStatus ? (
                <div className='p-3 rounded border bg-muted/50'>
                  <div className='flex items-center gap-2 mb-2'>
                    {systemStatus.error ? (
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                    ) : (
                      <CheckCircle className='w-4 h-4 text-green-500' />
                    )}
                    <span className='font-medium'>
                      {systemStatus.error ? "Error" : `Status: ${systemStatus.status}`}
                    </span>
                  </div>
                  <pre className='text-xs overflow-auto'>
                    {JSON.stringify(systemStatus, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className='p-3 rounded border bg-muted/50'>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {/* Auth Status */}
          <div>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <User className='w-4 h-4' />
              Auth Status API
            </h3>
            <div className='space-y-2'>
              {authStatus ? (
                <div className='p-3 rounded border bg-muted/50'>
                  <div className='flex items-center gap-2 mb-2'>
                    {authStatus.error ? (
                      <AlertTriangle className='w-4 h-4 text-red-500' />
                    ) : (
                      <CheckCircle className='w-4 h-4 text-green-500' />
                    )}
                    <span className='font-medium'>
                      {authStatus.error ? "Error" : `Status: ${authStatus.status}`}
                    </span>
                  </div>
                  <pre className='text-xs overflow-auto'>
                    {JSON.stringify(authStatus, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className='p-3 rounded border bg-muted/50'>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  Loading...
                </div>
              )}
            </div>
          </div>

          {/* Environment Info */}
          <div>
            <h3 className='text-lg font-semibold mb-3'>Environment Info</h3>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='space-y-1'>
                <div className='flex justify-between'>
                  <span>User Agent:</span>
                  <span className='text-xs truncate max-w-32'>
                    {typeof window !== 'undefined' ? window.navigator.userAgent.split(' ')[0] : 'N/A'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Viewport:</span>
                  <span className='text-xs'>
                    {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className='space-y-1'>
                <div className='flex justify-between'>
                  <span>Local Storage:</span>
                  <Badge variant={typeof window !== 'undefined' && window.localStorage ? "default" : "destructive"}>
                    {typeof window !== 'undefined' && window.localStorage ? "Available" : "Not Available"}
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span>Theme Preference:</span>
                  <span className='text-xs'>
                    {typeof window !== 'undefined' ? localStorage.getItem('theme') || 'None' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className='p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800'>
            <h4 className='font-medium text-blue-900 dark:text-blue-100 mb-2'>Debug Instructions</h4>
            <ul className='text-sm text-blue-800 dark:text-blue-200 space-y-1'>
              <li>• Check if System Status API returns 200 status</li>
              <li>• Verify Auth Status API returns user data correctly</li>
              <li>• Test theme toggle - background should change</li>
              <li>• Check browser console for any JavaScript errors</li>
              <li>• Verify localStorage is working for theme persistence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
