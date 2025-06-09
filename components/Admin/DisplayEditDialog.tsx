import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDisplayMutations } from "@/hooks/useDisplayMutations";

interface DisplayEditDialogProps {
  display?: {
    _id: string;
    name: string;
    orientation?: "landscape" | "portrait";
    layout?: "spaced" | "compact";
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
    name: "",
    layout: "spaced" as "spaced" | "compact",
    location: "",
    building: "",
    ipAddress: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (display && !isCreateMode) {
      setFormData({
        name: display.name || "",
        layout: display.layout || "spaced",
        location: "",
        building: "",
        ipAddress: "",
      });
    } else {
      setFormData({
        name: "",
        layout: "spaced",
        location: "",
        building: "",
        ipAddress: "",
      });
    }
  }, [display, isCreateMode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
            layout: formData.layout,
            location: formData.location || 'Unknown Location',
            building: formData.building || 'Main Building',
          },
        });
      } else if (display) {
        await updateDisplay.mutateAsync({
          id: display._id,
          data: {
            name: formData.name,
            layout: formData.layout,
          },
        });
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {isCreateMode ? "Register Physical Display" : "Edit Display"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isCreateMode
                ? "Register a physical display device that's already connected"
                : "Update display information and settings"
              }
            </p>
          </div>
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

            {isCreateMode && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  📱 Physical Display Setup
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Before registering, make sure your physical display device is:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>• Connected to the network</li>
                  <li>• Showing a layout from the display selector</li>
                  <li>• Sending heartbeat data to the server</li>
                </ul>
              </div>
            )}

            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Display Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder={isCreateMode ? "e.g., Lobby Display - Main Building" : "Enter display name"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Lobby, Conference Room A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="building"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Building
                </label>
                <input
                  type="text"
                  id="building"
                  name="building"
                  value={formData.building}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Office, Innovation Center"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>



            <div className="mb-6">
              <label
                htmlFor="layout"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Layout Style
              </label>
              <select
                id="layout"
                name="layout"
                value={formData.layout}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="spaced">
                  Spaced - More padding between widgets
                </option>
                <option value="compact">
                  Compact - Minimal spacing between widgets
                </option>
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
              {loading
                ? "Saving..."
                : isCreateMode
                  ? "Register Display"
                  : "Update Display"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisplayEditDialog;
