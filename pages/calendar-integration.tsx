import React, { useState, useEffect } from "react";

import { useRouter } from "next/router";
import Frame from "../components/Admin/Frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ICalendarLink {
  _id: string;
  provider: "google" | "outlook";
  externalUserId: string;
  calendarId: string;
  isActive: boolean;
  lastSyncStatus?: "success" | "failed";
  lastSyncError?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const CalendarIntegrationPage = () => {
  const router = useRouter();
  const [calendarLinks, setCalendarLinks] = useState<ICalendarLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [syncingLinkId, setSyncingLinkId] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarLinks();
    
    // Handle OAuth callback results
    const { success, error } = router.query;
    if (success) {
      if (success === "google_connected") {
        toast.success("Google Calendar connected successfully!");
      } else if (success === "outlook_connected") {
        toast.success("Outlook Calendar connected successfully!");
      }
      // Clean up URL
      router.replace("/calendar-integration", undefined, { shallow: true });
    }
    if (error) {
      toast.error(`Connection failed: ${error}`);
      router.replace("/calendar-integration", undefined, { shallow: true });
    }
  }, [router.query]);

  const fetchCalendarLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/calendar");
      if (!response.ok) {
        throw new Error("Failed to fetch calendar connections");
      }
      const data = await response.json();
      setCalendarLinks(data.calendarLinks || []);
    } catch (error) {
      console.error("Error fetching calendar links:", error);
      toast.error("Failed to load calendar connections");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnectingProvider("google");
      const response = await fetch("/api/v1/calendar/google/authorize");
      if (!response.ok) {
        throw new Error("Failed to initiate Google OAuth");
      }
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      console.error("Error connecting to Google:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to Google Calendar");
      setConnectingProvider(null);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      setConnectingProvider("outlook");
      const response = await fetch("/api/v1/calendar/outlook/authorize");
      if (!response.ok) {
        throw new Error("Failed to initiate Outlook OAuth");
      }
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error: unknown) {
      console.error("Error connecting to Outlook:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to Outlook Calendar");
      setConnectingProvider(null);
    }
  };

  const handleDisconnectCalendar = async (linkId: string, provider: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} calendar?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/calendar/${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect calendar");
      }

      toast.success(`${provider} calendar disconnected successfully`);
      fetchCalendarLinks();
    } catch (error: unknown) {
      console.error("Error disconnecting calendar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to disconnect calendar");
    }
  };

  const handleManualSync = async (linkId: string, provider: string) => {
    try {
      setSyncingLinkId(linkId);
      const response = await fetch(`/api/v1/calendar/${linkId}/sync`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to trigger sync");
      }

      toast.success(`${provider} calendar sync initiated`);
      // Refresh the list after a short delay to show updated sync status
      setTimeout(() => {
        fetchCalendarLinks();
      }, 2000);
    } catch (error: unknown) {
      console.error("Error syncing calendar:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync calendar");
    } finally {
      setSyncingLinkId(null);
    }
  };

  const getStatusBadge = (link: ICalendarLink) => {
    if (!link.isActive) {
      return <Badge variant='destructive'>Inactive</Badge>;
    }

    if (!link.lastSyncStatus) {
      return <Badge variant='secondary'>Not Synced</Badge>;
    }

    switch (link.lastSyncStatus) {
      case "success":
        return <Badge variant='default' className='bg-green-500'>Connected</Badge>;
      case "failed":
        return <Badge variant='destructive'>Sync Failed</Badge>;
      default:
        return <Badge variant='secondary'>Unknown</Badge>;
    }
  };

  const getStatusIcon = (link: ICalendarLink) => {
    if (!link.isActive) {
      return <XCircle className='h-4 w-4 text-destructive' />;
    }

    if (!link.lastSyncStatus) {
      return <AlertCircle className='h-4 w-4 text-muted-foreground' />;
    }

    switch (link.lastSyncStatus) {
      case "success":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "failed":
        return <XCircle className='h-4 w-4 text-destructive' />;
      default:
        return <AlertCircle className='h-4 w-4 text-muted-foreground' />;
    }
  };

  const getProviderLogo = (provider: string) => {
    switch (provider) {
      case "google":
        return "🔗"; // You can replace with actual Google logo
      case "outlook":
        return "📧"; // You can replace with actual Outlook logo
      default:
        return "📅";
    }
  };

  const hasProvider = (provider: string) => {
    return calendarLinks.some(link => link.provider === provider && link.isActive);
  };

  return (
    <Frame loggedIn={true}>
      <div className='space-y-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Calendar Integration</h1>
          <p className='text-muted-foreground'>
            Connect your Google and Outlook calendars to sync meeting room reservations
          </p>
        </div>

        {/* Connection Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <span className='mr-2 text-2xl'>{getProviderLogo("google")}</span>
                Google Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <p className='text-sm text-muted-foreground'>
                  Sync your Google Calendar events with meeting room reservations
                </p>
                {hasProvider("google") ? (
                  <div className='flex items-center space-x-2'>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <span className='text-sm font-medium'>Connected</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={connectingProvider === "google"}
                    className='w-full'
                  >
                    {connectingProvider === "google" ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className='mr-2 h-4 w-4' />
                        Connect Google Calendar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Outlook Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <span className='mr-2 text-2xl'>{getProviderLogo("outlook")}</span>
                Outlook Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <p className='text-sm text-muted-foreground'>
                  Sync your Outlook Calendar events with meeting room reservations
                </p>
                {hasProvider("outlook") ? (
                  <div className='flex items-center space-x-2'>
                    <CheckCircle className='h-5 w-5 text-green-500' />
                    <span className='text-sm font-medium'>Connected</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectOutlook}
                    disabled={connectingProvider === "outlook"}
                    className='w-full'
                  >
                    {connectingProvider === "outlook" ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className='mr-2 h-4 w-4' />
                        Connect Outlook Calendar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Calendars List */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <CalendarDays className='mr-2 h-5 w-5' />
              Connected Calendars
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='text-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin mx-auto mb-2' />
                Loading calendar connections...
              </div>
            ) : calendarLinks.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                No calendars connected. Connect your first calendar to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendarLinks.map((link) => (
                    <TableRow key={link._id}>
                      <TableCell>
                        <div className='flex items-center'>
                          <span className='mr-2 text-lg'>{getProviderLogo(link.provider)}</span>
                          <span className='font-medium capitalize'>{link.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          {getStatusIcon(link)}
                          {getStatusBadge(link)}
                        </div>
                        {link.lastSyncError && (
                          <div className='mt-1'>
                            <Alert className='p-2'>
                              <AlertCircle className='h-3 w-3' />
                              <AlertDescription className='text-xs'>
                                {link.lastSyncError}
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {link.lastSyncedAt ? (
                          <span className='text-sm'>
                            {new Date(link.lastSyncedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className='text-sm text-muted-foreground'>Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className='text-sm'>
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className='flex space-x-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleManualSync(link._id, link.provider)}
                            disabled={syncingLinkId === link._id}
                          >
                            {syncingLinkId === link._id ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <RefreshCw className='h-4 w-4' />
                            )}
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDisconnectCalendar(link._id, link.provider)}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sync Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  Calendar sync runs automatically every 15 minutes. You can also trigger manual sync using the refresh button.
                </AlertDescription>
              </Alert>
              <div className='text-sm text-muted-foreground space-y-2'>
                <p>• External calendar events will be imported as reservations</p>
                <p>• Reservations created in the system will be synced to connected calendars</p>
                <p>• Changes made in external calendars will be reflected in the system</p>
                <p>• Deleted events will be removed from both systems</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Frame>
  );
};

export default CalendarIntegrationPage;
