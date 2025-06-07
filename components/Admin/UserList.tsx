import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faThLarge, // Using faThLarge instead of faPlus
  faKey, // Using faKey instead of faUser
  faTv, // Using faTv instead of faUserShield
  faImages, // Using faImages instead of faUserTie
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import useUsers, { User } from '@/hooks/useUsers';
import { UserRoleName } from '@/lib/models/User';
import UserEditDialog from './UserEditDialog';

const UserList: React.FC = () => {
  const { users, loading, error, pagination, fetchUsers, deleteUser } = useUsers();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

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

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center text-lg text-gray-600">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
        <h1 className="text-3xl font-semibold text-gray-800">User Management</h1>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={handleCreateUser}
        >
          <FontAwesomeIcon icon={faThLarge} /> Create User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Created</div>
          <div>Actions</div>
        </div>

        {/* User rows */}
        {users.map((user) => (
          <div key={user._id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 items-center">
            <div className="flex items-center">
              <FontAwesomeIcon 
                icon={getRoleIcon(user.role.name)} 
                className={`w-4 h-4 mr-2 text-white p-1 rounded ${getRoleColor(user.role.name)}`}
              />
              <span className="font-medium text-gray-900">{user.name || 'Unnamed User'}</span>
            </div>
            <div className="text-gray-600">{user.email}</div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${getRoleColor(user.role.name)}`}>
                {user.role.name}
              </span>
            </div>
            <div className="text-gray-600 text-sm">{formatDate(user.createdAt)}</div>
            <div className="flex gap-2">
              <button 
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded transition-colors"
                onClick={() => handleEditUser(user)}
                title="Edit User"
              >
                <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
              </button>
              <button 
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors"
                onClick={() => handleDeleteUser(user)}
                title="Delete User"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found. Create your first user to get started.
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`px-3 py-2 rounded border transition-colors ${
                page === pagination.page
                  ? 'bg-blue-600 text-white border-blue-600'
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
      <div className="text-center text-sm text-gray-500 mt-6">
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
};

export default UserList;