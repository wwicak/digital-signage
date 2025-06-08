import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useDisplayMutations } from '@/hooks/useDisplayMutations';
import OrientationPreview from './OrientationPreview';

interface DisplayEditDialogProps {
  display?: {
    _id: string;
    name: string;
    orientation?: 'landscape' | 'portrait';
    layout?: 'spaced' | 'compact';
  } | null;
  isCreateMode: boolean;
  onClose: () => void;
  onSave: () => void;
}

const DisplayEditDialog: React.FC<DisplayEditDialogProps> = ({
  display,
  isCreateMode,
  onClose,
  onSave,
}) => {
  const { createDisplay, updateDisplay } = useDisplayMutations();
  
  const [formData, setFormData] = useState({
    name: '',
    orientation: 'landscape' as 'landscape' | 'portrait',
    layout: 'spaced' as 'spaced' | 'compact',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (display && !isCreateMode) {
      setFormData({
        name: display.name || '',
        orientation: display.orientation || 'landscape',
        layout: display.layout || 'spaced',
      });
    } else {
      setFormData({
        name: '',
        orientation: 'landscape',
        layout: 'spaced',
      });
    }
  }, [display, isCreateMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isCreateMode) {
        await createDisplay.mutateAsync({
          data: {
            name: formData.name,
            orientation: formData.orientation,
            layout: formData.layout,
          }
        });
      } else if (display) {
        await updateDisplay.mutateAsync({
          id: display._id,
          data: {
            name: formData.name,
            orientation: formData.orientation,
            layout: formData.layout,
          }
        });
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">
            {isCreateMode ? 'Create New Display' : 'Edit Display'}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 p-1"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
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
                Display Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter display name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="orientation" className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <div className="flex items-center gap-4 mb-3">
                <OrientationPreview orientation={formData.orientation} />
                <span className="text-sm text-gray-600">
                  Current: {formData.orientation.charAt(0).toUpperCase() + formData.orientation.slice(1)}
                </span>
              </div>
              <select
                id="orientation"
                name="orientation"
                value={formData.orientation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="landscape">
                  🖥️ Landscape (Horizontal)
                </option>
                <option value="portrait">
                  📱 Portrait (Vertical)
                </option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the orientation that matches your display hardware
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="layout" className="block text-sm font-medium text-gray-700 mb-2">
                Layout Style
              </label>
              <select
                id="layout"
                name="layout"
                value={formData.layout}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="spaced">Spaced - More padding between widgets</option>
                <option value="compact">Compact - Minimal spacing between widgets</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Layout style affects widget spacing and visual density
              </p>
            </div>
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
              {loading ? 'Saving...' : isCreateMode ? 'Create Display' : 'Update Display'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisplayEditDialog;
