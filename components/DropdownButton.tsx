'use client'

import React, { Component, ReactNode, CSSProperties } from 'react'
import {  } from 'lucide-react'
import { getIcon, type IconComponent } from '@/lib/icons'

export interface IDropdownChoice {
  key: string; // Used as the value for onSelect
  name: string; // Display text for the choice
  icon?:  | string; // Lucide icon component or icon name
}

export interface IDropdownButtonProps {
  icon?:  | string; // Lucide icon component or icon name
  text?: string;
  choices?: IDropdownChoice[];
  onSelect?: (key: string) => void;
  style?: CSSProperties;
  menuStyle?: CSSProperties;
  children?: ReactNode; // If children are provided, they act as the button
}

interface IDropdownButtonState {
  showMenu: boolean;
}

class DropdownButton extends Component<IDropdownButtonProps, IDropdownButtonState> {
  private dropdownMenu: HTMLDivElement | null = null

  constructor(props: IDropdownButtonProps) {
    super(props)

    this.state = {
      showMenu: false,
    }

    /*
     * Binding in constructor is generally preferred over arrow functions for class methods
     * if not using experimental class properties syntax.
     */
    this.showMenu = this.showMenu.bind(this)
    this.closeMenu = this.closeMenu.bind(this)
  }

  showMenu(event: React.MouseEvent | React.KeyboardEvent): void {
    event.preventDefault()
    event.stopPropagation() // Prevent event from immediately triggering closeMenu if it bubbles to document

    this.setState({ showMenu: true }, () => {
      document.addEventListener('click', this.closeMenu)
      document.addEventListener('touchend', this.closeMenu) // For touch devices
    })
  }

  closeMenu(event?: MouseEvent | TouchEvent, force: boolean = false): void {
    // Check if the click is outside the dropdown menu
    if (force || (this.dropdownMenu && event && !this.dropdownMenu.contains(event.target as Node))) {
      this.setState({ showMenu: false }, () => {
        document.removeEventListener('click', this.closeMenu)
        document.removeEventListener('touchend', this.closeMenu)
      })
    }
  }

  componentWillUnmount() {
    // Clean up event listeners when the component is unmounted
    document.removeEventListener('click', this.closeMenu)
    document.removeEventListener('touchend', this.closeMenu)
  }

  handleChoiceClick = (key: string): void => {
    this.closeMenu(undefined, true /* force close */)
    if (this.props.onSelect) {
      this.props.onSelect(key)
    }
  }

  renderIcon = (icon:  | string, className: string = "w-4 h-4") => {
    if (typeof icon === 'string') {
      // Icon name - get from mapping
      const IconComponent = getIcon(icon)
      return <IconComponent className={className} />
    } else if (typeof icon === 'function') {
      // Direct Lucide icon component
      const IconComponent = icon as 
      return <IconComponent className={className} />
    }
    return null
  }

  render() {
    const {
      icon,
      text = 'Show menu',
      choices = [],
      style = {},
      menuStyle = {},
      children,
    } = this.props

    return (
      <div className="inline-block align-middle relative">
        {children ? (
          <div style={style} onClick={this.showMenu} role='button' tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') this.showMenu(e) }}>
            {children}
          </div>
        ) : (
          <button
            type='button'
            className="font-sans bg-green-500 hover:bg-green-600 text-white text-sm uppercase rounded border-none inline-block px-6 py-4 outline-none cursor-pointer transition-colors duration-200"
            onClick={this.showMenu}
            style={style}
          >
            {icon && <div className="mr-4 inline">{this.renderIcon(icon)}</div>}
            {text}
          </button>
        )}

        {this.state.showMenu && (
          <div
            className="absolute top-full left-0 mt-2 flex flex-col z-10 bg-white shadow-lg rounded overflow-hidden min-w-full"
            ref={element => {
              this.dropdownMenu = element
            }}
            style={menuStyle}
          >
            {choices.map(choice => (
              <button
                type='button'
                key={choice.key}
                className="font-sans bg-white hover:bg-gray-50 text-gray-800 min-w-[200px] text-sm uppercase border-none border-b border-gray-100 last:border-b-0 flex px-6 py-4 text-left outline-none cursor-pointer flex-row items-center transition-colors duration-200"
                onClick={() => this.handleChoiceClick(choice.key)}
              >
                {choice.icon && (
                  <div className="mr-4 inline">
                    {this.renderIcon(choice.icon)}
                  </div>
                )}
                {choice.name}
              </button>
            ))}
          </div>
        )}

      </div>
    )
  }
}

export default DropdownButton
