import React, { useState } from "react";
import { Tv, Layout, Cast, Eye, ExternalLink, Trash2 } from "lucide-react";
import OrientationPreview from "./OrientationPreview";

interface IDisplayData {
  _id: string;
  name: string;
  orientation?: "landscape" | "portrait";
  widgets?: any[];
}

interface IScreenCardDemoProps {
  value: IDisplayData;
  onOrientationChange?: (
    id: string,
    orientation: "landscape" | "portrait",
  ) => void;
}

const ScreenCardDemo: React.FC<IScreenCardDemoProps> = ({
  value,
  onOrientationChange,
}) => {
  const [isUpdatingOrientation, setIsUpdatingOrientation] = useState(false);

  const handleOrientationChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    const newOrientation = event.target.value as "landscape" | "portrait";
    if (value && value._id && newOrientation !== value.orientation) {
      setIsUpdatingOrientation(true);

      // Simulate API call delay
      setTimeout(() => {
        setIsUpdatingOrientation(false);
        if (onOrientationChange) {
          onOrientationChange(value._id, newOrientation);
        }
      }, 500);
    }
  };

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    alert(`Delete ${value.name}`);
  };

  const handleView = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    alert(`View ${value.name}`);
  };

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    alert(`Edit ${value.name}`);
  };

  const widgetCount =
    value && Array.isArray(value.widgets) ? value.widgets.length : 0;

  return (
    <div className='p-3 font-sans rounded cursor-pointer bg-white mt-10 mb-10 flex flex-row justify-center relative transition-shadow duration-200'>
      <div className='font-sans justify-center pl-2 pr-2 flex items-center'>
        <div className='h-12 w-12 bg-cover flex justify-center items-center border border-gray-200 rounded'>
          <Tv className='w-6 h-6 text-primary' />
        </div>
      </div>
      <div className='font-sans flex flex-col justify-center pl-2 pr-2 flex-1'>
        <div className='font-sans text-base overflow-hidden whitespace-nowrap text-ellipsis text-gray-600 mb-2'>
          {value?.name || "Untitled Display"}
        </div>
        <div className='flex flex-row items-center'>
          <div className='font-sans text-sm text-gray-500 mr-3 flex items-center'>
            <div className='mr-1'>
              <Layout className='w-4 h-4 text-gray-500' />
            </div>
            <span>{widgetCount} widgets</span>
          </div>
          <div className='font-sans text-sm text-gray-500 mr-3 flex items-center'>
            <div className='mr-1'>
              <Cast className='w-4 h-4 text-gray-500' />
            </div>
            <span>1 client paired</span>
          </div>
          <div className='flex-col items-start'>
            <OrientationPreview orientation={value?.orientation || null} />
            <select
              value={value?.orientation || "landscape"}
              onChange={handleOrientationChange}
              disabled={isUpdatingOrientation}
              onClick={(e) => e.stopPropagation()}
              className='font-sans bg-white text-gray-600 cursor-pointer'
            >
              <option value='landscape'>Landscape</option>
              <option value='portrait'>Portrait</option>
            </select>
          </div>
          <div className='text-primary'>
            <span className='text'>online</span>
          </div>
        </div>
      </div>
      <div className='flex flex-row font-sans justify-center items-center pl-2 pr-2'>
        <div
          className='mr-2 ml-2 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center cursor-pointer'
          onClick={handleEdit}
          aria-label='Edit Layout'
        >
          <Eye className='w-4 h-4 text-gray-500' />
        </div>
        <div
          className='mr-2 ml-2 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center cursor-pointer'
          onClick={handleView}
          aria-label='View Display'
        >
          <ExternalLink className='w-4 h-4 text-gray-500' />
        </div>
        <div
          className='mr-2 ml-2 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center cursor-pointer'
          onClick={handleDelete}
          aria-label='Delete Display'
        >
          <Trash2 className='w-4 h-4 text-gray-500' />
        </div>
      </div>
    </div>
  );
};

export default ScreenCardDemo;
