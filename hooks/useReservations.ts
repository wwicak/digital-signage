import { useState, useEffect } from "react";

export interface IBuilding {
  _id: string;
  name: string;
  address: string;
}

export interface IRoom {
  _id: string;
  name: string;
  building_id: IBuilding;
  capacity: number;
  facilities: string[];
}

export interface IReservation {
  _id: string;
  title: string;
  room_id: IRoom;
  start_time: string;
  end_time: string;
  organizer: string;
  attendees: string[];
  agenda_meeting: string;
  sourceCalendarType?: "google" | "outlook" | "internal";
  isExternallyManaged?: boolean;
  creation_date: string;
  last_update: string;
}

export interface IReservationsResponse {
  reservations: IReservation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface IReservationFilters {
  page?: number;
  limit?: number;
  roomId?: string;
  buildingId?: string;
  startDate?: string;
  endDate?: string;
}

export const useReservations = (filters: IReservationFilters = {}) => {
  const [data, setData] = useState<IReservation[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append("page", (filters.page || 1).toString());
      params.append("limit", (filters.limit || 50).toString());
      
      if (filters.roomId && filters.roomId !== "all") {
        params.append("room_id", filters.roomId);
      }
      if (filters.buildingId && filters.buildingId !== "all") {
        params.append("building_id", filters.buildingId);
      }
      if (filters.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters.endDate) {
        params.append("end_date", filters.endDate);
      }
      
      const response = await fetch(`/api/v1/reservations?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reservations");
      }
      
      const result: IReservationsResponse = await response.json();
      setData(result.reservations);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message || "Failed to fetch reservations");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [
    filters.page,
    filters.limit,
    filters.roomId,
    filters.buildingId,
    filters.startDate,
    filters.endDate,
  ]);

  const refetch = () => {
    fetchReservations();
  };

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch,
  };
};
