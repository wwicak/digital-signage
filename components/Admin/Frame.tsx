import React, { ReactNode } from "react";
import * as z from "zod";
import { Container } from "@/components/ui/container";

import Sidebar from "./Sidebar"; // Assuming Sidebar.js or Sidebar.tsx
import { useDisplayContext } from "../../contexts/DisplayContext";

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
    return true;
  }),
  loggedIn: z.boolean().optional(),
});

// Derive TypeScript type from Zod schema
export type IFrameProps = z.infer<typeof FramePropsSchema>;

const Frame: React.FC<IFrameProps> = (props) => {
  const { state } = useDisplayContext();

  return (
    <div className="flex flex-row flex-1 min-h-screen bg-background">
      {/* Only render Sidebar when user is logged in */}
      {props.loggedIn && (
        <Sidebar loggedIn={props.loggedIn} displayId={state.id} />
      )}
      <main className="flex-1 overflow-y-auto">
        <Container className="py-8">{props.children}</Container>
      </main>
    </div>
  );
};

export default Frame;
