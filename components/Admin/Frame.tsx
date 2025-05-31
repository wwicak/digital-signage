import React, { ReactNode } from 'react'
import * as z from 'zod'

import Sidebar from './Sidebar' // Assuming Sidebar.js or Sidebar.tsx
import { useDisplayContext } from '../../contexts/DisplayContext'

// Zod schema for Frame props
export const FramePropsSchema = z.object({
  children: z.custom<ReactNode>((val) => {
    /*
     * This is a basic check. React.isValidElement is more robust for elements.
     * For general ReactNode (elements, strings, numbers, fragments, portals, null, undefined),
     * this check might be too simplistic or too complex to be exhaustive here.
     * Often, for ReactNode, z.any() is used if strict validation isn't critical.
     * Or, rely on TypeScript's inference if children are passed correctly.
     * For this exercise, we'll assume it's a valid ReactNode.
     */
    return true
  }),
  loggedIn: z.boolean().optional(),
})

// Derive TypeScript type from Zod schema
export type IFrameProps = z.infer<typeof FramePropsSchema>;

const Frame: React.FC<IFrameProps> = (props) => {
  const { state } = useDisplayContext()
  
  return (
    <div className='admin-frame-container'>
      {/* The displayId for the Sidebar is taken from the context */}
      <Sidebar loggedIn={props.loggedIn} displayId={state.id} />
      <div className='admin-frame-content'>{props.children}</div>
      <style jsx>
        {`
          .admin-frame-container {
            display: flex;
            flex-direction: row;
            flex: 1; /* This makes the frame take up available space if it's a child of a flex container */
            min-height: 100vh; /* Ensure it takes at least full viewport height */
          }
          .admin-frame-content {
            padding: 40px;
            background: #f4f4f4;
            flex: 1; /* Content area takes remaining space */
            overflow-y: auto; /* Add scroll for content overflow */
          }
        `}
      </style>
    </div>
  )
}

export default Frame
