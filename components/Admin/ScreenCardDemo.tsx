import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faWindowRestore } from '@fortawesome/free-regular-svg-icons'
import { faChromecast } from '@fortawesome/free-brands-svg-icons'
import { faTrash, faTv, faEye, faLink } from '@fortawesome/free-solid-svg-icons'
import OrientationPreview from './OrientationPreview'

interface IDisplayData {
  _id: string;
  name: string;
  orientation?: 'landscape' | 'portrait';
  widgets?: any[];
}

interface IScreenCardDemoProps {
  value: IDisplayData;
  onOrientationChange?: (id: string, orientation: 'landscape' | 'portrait') => void;
}

const ScreenCardDemo: React.FC<IScreenCardDemoProps> = ({ value, onOrientationChange }) => {
  const [isUpdatingOrientation, setIsUpdatingOrientation] = useState(false)

  const handleOrientationChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    
    const newOrientation = event.target.value as 'landscape' | 'portrait'
    if (value && value._id && newOrientation !== value.orientation) {
      setIsUpdatingOrientation(true)
      
      // Simulate API call delay
      setTimeout(() => {
        setIsUpdatingOrientation(false)
        if (onOrientationChange) {
          onOrientationChange(value._id, newOrientation)
        }
      }, 500)
    }
  }

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    alert(`Delete ${value.name}`)
  }

  const handleView = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    alert(`View ${value.name}`)
  }

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    alert(`Edit ${value.name}`)
  }

  const widgetCount = value && Array.isArray(value.widgets) ? value.widgets.length : 0

  return (
    <div className='card'>
      <div className='left'>
        <div className={'thumbnail'}>
          <FontAwesomeIcon icon={faTv as IconProp} fixedWidth size='lg' color='#7bc043' />
        </div>
      </div>
      <div className='middle'>
        <div className='title'>{value?.name || 'Untitled Display'}</div>
        <div className='info'>
          <div className='widgetnum'>
            <div className='icon'>
              <FontAwesomeIcon icon={faWindowRestore as IconProp} fixedWidth color='#878787' />
            </div>
            <span className='text'>{widgetCount} widgets</span>
          </div>
          <div className='clientnum'>
            <div className='icon'>
              <FontAwesomeIcon icon={faChromecast as IconProp} fixedWidth color='#878787' />
            </div>
            <span className='text'>1 client paired</span>
          </div>
          <div className='orientation-control'>
            <OrientationPreview orientation={value?.orientation || null} />
            <select 
              value={value?.orientation || 'landscape'} 
              onChange={handleOrientationChange}
              disabled={isUpdatingOrientation}
              onClick={(e) => e.stopPropagation()}
              className='orientation-select'
            >
              <option value='landscape'>Landscape</option>
              <option value='portrait'>Portrait</option>
            </select>
          </div>
          <div className='online'>
            <span className='text'>online</span>
          </div>
        </div>
      </div>
      <div className='right'>
        <div className='actionIcon' onClick={handleEdit} aria-label='Edit Layout'>
          <FontAwesomeIcon icon={faEye as IconProp} fixedWidth color='#828282' />
        </div>
        <div className='actionIcon' onClick={handleView} aria-label='View Display'>
          <FontAwesomeIcon icon={faLink as IconProp} fixedWidth color='#828282' />
        </div>
        <div className='actionIcon' onClick={handleDelete} aria-label='Delete Display'>
          <FontAwesomeIcon icon={faTrash as IconProp} fixedWidth color='#828282' />
        </div>
      </div>
      <style jsx>
        {`
          .card {
            padding: 12px;
            font-family: 'Open Sans', sans-serif;
            border-radius: 4px;
            cursor: pointer;
            background: white;
            margin-top: 40px;
            margin-bottom: 40px;
            display: flex;
            flex-direction: row;
            justify-content: center;
            position: relative;
            z-index: 1;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease-in-out;
          }
          .card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .title {
            font-family: 'Open Sans', sans-serif;
            font-size: 16px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            color: #4f4f4f;
            margin-bottom: 8px;
          }

          .left {
            font-family: 'Open Sans', sans-serif;
            justify-content: center;
            padding-left: 8px;
            padding-right: 8px;
            display: flex;
            align-items: center;
          }

          .info {
            display: flex;
            flex-direction: row;
            align-items: center;
          }

          .widgetnum,
          .online,
          .clientnum,
          .orientation-control {
            font-family: 'Open Sans', sans-serif;
            font-size: 14px;
            color: #878787;
            margin-right: 12px;
            display: flex;
            align-items: center;
          }

          .orientation-control {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .orientation-select {
            font-family: 'Open Sans', sans-serif;
            font-size: 12px;
            padding: 2px 4px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background: white;
            color: #666;
            cursor: pointer;
            min-width: 80px;
          }

          .orientation-select:hover {
            border-color: #7bc043;
          }

          .orientation-select:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .widgetnum .icon,
          .clientnum .icon {
            margin-right: 4px;
          }

          .online {
            color: #7bc043;
          }

          .online::before {
            content: '•';
            color: #7bc043;
            font-size: 32px;
            line-height: 14px;
            margin-right: 4px;
            vertical-align: middle;
          }

          .middle {
            font-family: 'Open Sans', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-left: 8px;
            padding-right: 8px;
            flex: 1;
            min-width: 0;
          }

          .right {
            display: flex;
            flex-direction: row;
            font-family: 'Open Sans', sans-serif;
            justify-content: center;
            align-items: center;
            padding-left: 8px;
            padding-right: 8px;
          }

          .thumbnail {
            height: 60px;
            width: 60px;
            background-size: cover;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px solid #eee;
            border-radius: 4px;
          }

          .actionIcon {
            margin-right: 8px;
            margin-left: 8px;
            padding: 8px;
            border-radius: 50%;
            transition: background-color 0.2s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .actionIcon:hover {
            background-color: #f0f0f0;
          }
          .actionIcon:last-child {
              margin-right: 0;
          }
        `}
      </style>
    </div>
  )
}

export default ScreenCardDemo