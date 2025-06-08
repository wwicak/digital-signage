import React from 'react'

// Define prop types, even if empty, for clarity and future use
interface EmptyWidgetProps {}

// Define state types, even if empty
interface EmptyWidgetState {}

class EmptyWidget extends React.Component<EmptyWidgetProps, EmptyWidgetState> {
  render() {
    return (
      <div className="bg-gray-600 w-full h-full flex flex-col justify-center rounded-lg shadow-md">
        <div className="flex flex-col justify-center items-center text-white">
          <div className="text-white mb-4">
            <faTimes  />
          </div>
          <span className="text-white font-sans uppercase text-base mb-4 tracking-wide">
            BROKEN WIDGET
          </span>
        </div>
      </div>
    )
  }
}

export default EmptyWidget