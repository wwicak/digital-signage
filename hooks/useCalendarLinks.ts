import { useState, useEffect } from "react";

export interface ICalendarLink {
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

export interface ICalendarLinksResponse {
  calendarLinks: ICalendarLink[];
  total: number;
}

export const useCalendarLinks = () => {
  const [data, setData] = useState<ICalendarLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarLinks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/v1/calendar");
      if (!response.ok) {
        throw new Error("Failed to fetch calendar connections");
      }
      
      const result: ICalendarLinksResponse = await response.json();
      setData(result.calendarLinks);
    } catch (err: any) {
      setError(err.message || "Failed to fetch calendar connections");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarLinks();
  }, []);

  const refetch = () => {
    fetchCalendarLinks();
  };

  const connectGoogle = async (): Promise<string> => {
    const response = await fetch("/api/v1/calendar/google/authorize");
    if (!response.ok) {
      throw new Error("Failed to initiate Google OAuth");
    }
    const data = await response.json();
    return data.authUrl;
  };

  const connectOutlook = async (): Promise<string> => {
    const response = await fetch("/api/v1/calendar/outlook/authorize");
    if (!response.ok) {
      throw new Error("Failed to initiate Outlook OAuth");
    }
    const data = await response.json();
    return data.authUrl;
  };

  const disconnectCalendar = async (linkId: string): Promise<void> => {
    const response = await fetch(`/api/v1/calendar/${linkId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to disconnect calendar");
    }
    await refetch();
  };

  const syncCalendar = async (linkId: string): Promise<any> => {
    const response = await fetch(`/api/v1/calendar/${linkId}/sync`, {
      method: "POST",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to sync calendar");
    }
    const result = await response.json();
    await refetch();
    return result;
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    connectGoogle,
    connectOutlook,
    disconnectCalendar,
    syncCalendar,
  };
};
