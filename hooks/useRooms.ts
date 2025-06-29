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
  creation_date: string;
  last_update: string;
}

export interface IRoomsResponse {
  rooms: IRoom[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useRooms = (
  page: number = 1,
  limit: number = 10,
  buildingId?: string
) => {
  const [data, setData] = useState<IRoom[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = `/api/v1/rooms?page=${page}&limit=${limit}`;
      if (buildingId && buildingId !== "all") {
        url += `&building_id=${buildingId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }

      const result: IRoomsResponse = await response.json();
      setData(result.rooms);
      setPagination(result.pagination);
    } catch (err) {
      setError((err as Error).message || "Failed to fetch rooms");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [page, limit, buildingId]);

  const refetch = () => {
    fetchRooms();
  };

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch,
  };
};
