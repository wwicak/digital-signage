import { useState, useEffect } from "react";
import { UserRoleName, IUserRole } from "@/lib/models/User";

export interface User {
  _id: string;
  name?: string;
  email: string;
  role: IUserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: IUserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: IUserRole;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchUsers = async (page = 1, limit = 10) => {
    console.log(
      `[DEBUG] useUsers: Attempting to fetch users from /api/users?page=${page}&limit=${limit}`
    );
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
      console.log(
        `[DEBUG] useUsers: Response status: ${response.status}, statusText: ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] useUsers: API error response:`, errorText);
        throw new Error(
          `Failed to fetch users: ${response.statusText} - ${errorText}`
        );
      }

      const data: UsersResponse = await response.json();
      console.log(
        `[DEBUG] useUsers: Successfully fetched ${data.users.length} users`
      );
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch users";
      console.error(`[DEBUG] useUsers: Error in fetchUsers:`, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserData): Promise<User> => {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create user");
    }

    const result = await response.json();

    // Refresh the users list
    await fetchUsers(pagination.page, pagination.limit);

    return result.user;
  };

  const updateUser = async (
    userId: string,
    userData: UpdateUserData
  ): Promise<User> => {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    const result = await response.json();

    // Refresh the users list
    await fetchUsers(pagination.page, pagination.limit);

    return result.user;
  };

  const deleteUser = async (userId: string): Promise<void> => {
    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete user");
    }

    // Refresh the users list
    await fetchUsers(pagination.page, pagination.limit);
  };

  const getUser = async (userId: string): Promise<User> => {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch user");
    }

    const result = await response.json();
    return result.user;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUser,
  };
};

export default useUsers;
