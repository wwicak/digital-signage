import React, { useState, forwardRef, useImperativeHandle } from 'react';
import {
  faEdit,
  faTrash,
  faKey, // Using faKey instead of faUser
  faTv, // Using faTv instead of faUserShield
  faImages, // Using faImages instead of faUserTie
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import useUsers, { User } from '@/hooks/useUsers';
import { UserRoleName } from '@/lib/models/User';
import UserEditDialog from './UserEditDialog';
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

export interface IUserListRef {
  refresh: () => void;
  openCreateDialog: () => void;
}

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  const getRoleIcon = (roleName: UserRoleName) => {
    switch (roleName) {
      case UserRoleName.SUPER_ADMIN:
        return faTv;
      case UserRoleName.RESOURCE_MANAGER:
        return faImages;
      case UserRoleName.DISPLAY_MANAGER:
        return faKey;
      case UserRoleName.VIEWER:
        return faEye;
      default:
        return faKey;
    }
  };

  const getRoleColor = (roleName: UserRoleName) => {
    switch (roleName) {
      case UserRoleName.SUPER_ADMIN:
        return 'bg-red-500';
      case UserRoleName.RESOURCE_MANAGER:
        return 'bg-orange-500';
      case UserRoleName.DISPLAY_MANAGER:
        return 'bg-blue-500';
      case UserRoleName.VIEWER:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-3 font-sans rounded bg-white my-3 flex flex-row items-center relative z-10 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-center items-center pr-3">
        <div className={`h-12 w-12 rounded flex justify-center items-center ${getRoleColor(user.role.name)}`}>
          <LucideIcon icon={getRoleIcon(user.role.name) size='lg' color='#FFFFFF' />
        </div>
      </div>
      <div className="font-sans flex flex-col justify-center pr-2 flex-1 min-w-0">
        <div className="font-sans text-base overflow-hidden whitespace-nowrap text-ellipsis text-gray-600 mb-1">
          {user.name || 'Unnamed User'}
        </div>
        <div className="font-sans text-sm text-gray-500 flex items-center flex-wrap gap-4">
          <span>{user.email}</span>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${getRoleColor(user.role.name)}`}>
            {user.role.name}
          </span>
          <span>Created: {formatDate(user.createdAt)}</span>
        </div>
      </div>
      <div className="flex flex-row font-sans items-center">
        <div
          className="ml-2 p-2 rounded-full cursor-pointer transition-colors duration-200 hover:bg-gray-100"
          onClick={() => onEdit(user)}
          role='button'
          tabIndex={0}
          onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') onEdit(user)}}
          aria-label='Edit user'
        >
          <LucideIcon icon={Edit color='#828282' />
        </div>
        <div
          className="ml-2 p-2 rounded-full cursor-pointer transition-colors duration-200 hover:bg-gray-100"
          onClick={() => onDelete(user)}
          role='button'
          tabIndex={0}
          onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') onDelete(user)}}
          aria-label='Delete user'
        >
          <LucideIcon icon={Trash2 color='#828282' />
        </div>
      </div>
    </div>
  );
};

const UserList = forwardRef<IUserListRef>((props, ref) => {
  const { users, loading, error, pagination, fetchUsers, deleteUser } = useUsers();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchUsers(pagination.page, pagination.limit);
    },
    openCreateDialog: () => {
      handleCreateUser();
    }
  }));

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsCreateMode(false);
    setIsEditDialogOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsCreateMode(true);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.name || user.email}"?`)) {
      try {
        await deleteUser(user._id);
      } catch (error) {
        alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, pagination.limit);
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading users...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div>
      {/* User cards */}
      {users.map((user) => (
        <UserCard
          key={user._id}
          user={user}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      ))}

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500 font-sans">
          No users found. Create your first user to get started.
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-3 py-2 rounded border transition-colors font-sans ${
                page === pagination.page
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 mt-6 font-sans">
        Showing {users.length} of {pagination.total} users
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <UserEditDialog
          user={selectedUser}
          isCreateMode={isCreateMode}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={() => {
            setIsEditDialogOpen(false);
            fetchUsers(pagination.page, pagination.limit);
          }}
        />
      )}
    </div>
  );
});

export default UserList;