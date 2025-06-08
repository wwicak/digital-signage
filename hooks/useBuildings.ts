import { useState, useEffect } from "react";

export interface IBuilding {
  _id: string;
  name: string;
  address: string;
  creation_date: string;
  last_update: string;
}

export interface IBuildingsResponse {
  buildings: IBuilding[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useBuildings = (page: number = 1, limit: number = 10) => {
  const [data, setData] = useState<IBuilding[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/buildings?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      
      const result: IBuildingsResponse = await response.json();
      setData(result.buildings);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to fetch buildings");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [page, limit]);

  const refetch = () => {
    fetchBuildings();
  };

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch,
  };
};
