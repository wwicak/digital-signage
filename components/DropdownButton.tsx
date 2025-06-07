'use client'

import React, { Component, ReactNode, CSSProperties } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp, IconPrefix } from '@fortawesome/fontawesome-svg-core'

export interface IDropdownChoice {
  key: string; // Used as the value for onSelect
  name: string; // Display text for the choice
  icon?: IconProp; // Optional: icon for the choice
  iconPrefix?: IconPrefix; // Optional: icon prefix (e.g., 'fab' for brands)
  // Potentially other fields like 'href' if choices can be links, or 'disabled'
}

export interface IDropdownButtonProps {
  icon?: IconProp;
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
      <div className={'dropdownContainer'}>
        {children ? (
          <div style={style} onClick={this.showMenu} role='button' tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') this.showMenu(e) }}>
            {children}
          </div>
        ) : (
          <button type='button' className={'btn'} onClick={this.showMenu} style={style}>
            {icon && <div className={'btnIcon'}><FontAwesomeIcon icon={icon} /></div>}
            {text}
          </button>
        )}

        {this.state.showMenu && (
          <div
            className='menu'
            ref={element => {
              this.dropdownMenu = element
            }}
            style={menuStyle}
          >
            {choices.map(choice => (
              <button
                type='button'
                key={choice.key}
                className={'choice'}
                onClick={() => this.handleChoiceClick(choice.key)}
              >
                {choice.icon && (
                  <div className={'btnIcon'}>
                    <FontAwesomeIcon icon={choice.icon} />
                  </div>
                )}
                {choice.name}
              </button>
            ))}
          </div>
        )}
        <style jsx>
          {`
            .dropdownContainer {
              display: inline-block;
              vertical-align: middle;
              position: relative;
            }
            .btn {
              font-family: 'Open Sans', sans-serif;
              background: #7bc043;
              text-decoration: none;
              text-transform: uppercase;
              color: white;
              font-size: 14px;
              border-radius: 4px;
              border: none;
              display: inline-block;
              padding: 16px;
              padding-left: 24px;
              padding-right: 24px;
              outline: none;
              cursor: pointer;
            }
            .btnIcon {
              margin-right: 16px;
              display: inline;
            }
            .menu {
              position: absolute;
              top: calc(100% + 8px);
              left: 0;
              display: flex;
              flex-direction: column;
              z-index: 2;
              background: white;
              box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.1);
              border-radius: 4px;
              overflow: hidden;
              min-width: 100%;
            }
            .choice {
              font-family: 'Open Sans', sans-serif;
              background: white;
              text-decoration: none;
              text-transform: uppercase;
              color: #333;
              min-width: 200px;
              font-size: 14px;
              border: none;
              border-bottom: 1px solid #efefef;
              display: flex;
              padding: 16px;
              padding-left: 24px;
              padding-right: 24px;
              text-align: left;
              outline: none;
              cursor: pointer;
              flex-direction: row;
              align-items: center; /* Align icon and text */
            }
            .choice:hover {
              background: #fafafa;
            }
            .choice:last-child {
              border-bottom: 0px;
            }
          `}
        </style>
      </div>
    )
  }
}

export default DropdownButton
