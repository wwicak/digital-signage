import React, { useState, useEffect } from 'react';
import useUsers, { User, CreateUserData, UpdateUserData } from '@/hooks/useUsers';
import { useDisplays } from '@/hooks/useDisplays';
import { UserRoleName } from '@/lib/models/User';
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

interface UserEditDialogProps {
  user: User | null;
  isCreateMode: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Building {
  _id: string;
  name: string;
}

const UserEditDialog: React.FC<UserEditDialogProps> = ({
  user,
  isCreateMode,
  onClose,
  onSave,
}) => {
  const { createUser, updateUser } = useUsers();
  const { data: displays = [] } = useDisplays();
  const [buildings] = useState<Building[]>([]); // We'll populate this later when we have building API
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleName: UserRoleName.VIEWER,
    associatedBuildingIds: [] as string[],
    associatedDisplayIds: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isCreateMode) {
      setFormData({
        name: user.name || '',
        email: user.email,
        password: '',
        roleName: user.role.name,
        associatedBuildingIds: user.role.associatedBuildingIds?.map(id => id.toString()) || [],
        associatedDisplayIds: user.role.associatedDisplayIds?.map(id => id.toString()) || [],
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        roleName: UserRoleName.VIEWER,
        associatedBuildingIds: [],
        associatedDisplayIds: [],
      });
    }
  }, [user, isCreateMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'associatedBuildingIds' | 'associatedDisplayIds') => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      [field]: selectedOptions,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreateMode) {
        if (!formData.password) {
          throw new Error('Password is required for new users');
        }

        const createData: CreateUserData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: {
            name: formData.roleName,
            associatedBuildingIds: formData.associatedBuildingIds as any,
            associatedDisplayIds: formData.associatedDisplayIds as any,
          },
        };

        await createUser(createData);
      } else if (user) {
        const updateData: UpdateUserData = {
          name: formData.name,
          email: formData.email,
          role: {
            name: formData.roleName,
            associatedBuildingIds: formData.associatedBuildingIds as any,
            associatedDisplayIds: formData.associatedDisplayIds as any,
          },
        };

        await updateUser(user._id, updateData);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    [UserRoleName.SUPER_ADMIN]: 'Full system access - can manage all users, buildings, and displays',
    [UserRoleName.RESOURCE_MANAGER]: 'Can manage assigned buildings/displays and create users',
    [UserRoleName.DISPLAY_MANAGER]: 'Can manage content for assigned displays',
    [UserRoleName.VIEWER]: 'Read-only access to assigned displays',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">
            {isCreateMode ? 'Create New User' : 'Edit User'}
          </h2>
          <button 
            className="text-gray-500 hover:text-gray-700 p-1"
            onClick={onClose}
          >
            <LucideIcon icon={X} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {isCreateMode && (
              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                id="roleName"
                name="roleName"
                value={formData.roleName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {Object.values(UserRoleName).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{roleDescriptions[formData.roleName]}</p>
            </div>

            {(formData.roleName === UserRoleName.RESOURCE_MANAGER || 
              formData.roleName === UserRoleName.DISPLAY_MANAGER || 
              formData.roleName === UserRoleName.VIEWER) && (
              <div className="mb-6">
                <label htmlFor="associatedDisplayIds" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Displays
                </label>
                <select
                  id="associatedDisplayIds"
                  name="associatedDisplayIds"
                  multiple
                  value={formData.associatedDisplayIds}
                  onChange={(e) => handleMultiSelectChange(e, 'associatedDisplayIds')}
                  size={Math.min(displays.length, 6)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {displays.map((display: any) => (
                    <option key={display._id} value={display._id}>
                      {display.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple displays</p>
              </div>
            )}

            {formData.roleName === UserRoleName.RESOURCE_MANAGER && buildings.length > 0 && (
              <div className="mb-6">
                <label htmlFor="associatedBuildingIds" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Buildings
                </label>
                <select
                  id="associatedBuildingIds"
                  name="associatedBuildingIds"
                  multiple
                  value={formData.associatedBuildingIds}
                  onChange={(e) => handleMultiSelectChange(e, 'associatedBuildingIds')}
                  size={Math.min(buildings.length, 6)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple buildings</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button 
              type="button" 
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : isCreateMode ? 'Create User' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditDialog;