import React, { ReactNode } from "react";
import * as z from "zod";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Monitor } from "lucide-react";

import Sidebar from "./Sidebar"; // Assuming Sidebar.js or Sidebar.tsx
import { useDisplayContext } from "../../contexts/DisplayContext";

// Zod schema for Frame props
export const FramePropsSchema = z.object({
  children: z.custom<ReactNode>(() => true),
  loggedIn: z.boolean().optional(),
  title: z.string().optional(),
});

// Derive TypeScript type from Zod schema
export type IFrameProps = z.infer<typeof FramePropsSchema>;

const Frame: React.FC<IFrameProps> = (props) => {
  const { state } = useDisplayContext();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex flex-row flex-1 min-h-screen bg-background">
      {/* Modern Sidebar with collapsible functionality */}
      {props.loggedIn && (
        <div 
          className={`h-screen border-r border-border bg-card transition-all duration-300 ease-in-out ${
            collapsed ? "w-[70px]" : "w-[280px]"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className={`flex items-center gap-3 ${collapsed ? "justify-center w-full" : ""}`}>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              {!collapsed && (
                <div>
                  <h2 className="font-bold text-lg text-foreground">Digital Signage</h2>
                  <p className="text-xs text-muted-foreground">Management System</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button 
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <Sidebar 
            loggedIn={props.loggedIn} 
            displayId={state.id} 
            collapsed={collapsed}
          />

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="absolute bottom-4 left-4">
              <button 
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main content area with improved styling */}
      <main className="flex-1 overflow-y-auto bg-muted/30">
        {/* Header with title */}
        {props.title && (
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6">
              <h1 className="text-xl font-semibold text-foreground">{props.title}</h1>
            </div>
          </div>
        )}

        {/* Content container with proper spacing */}
        <Container className="py-6 px-6 max-w-7xl">
          <div className="space-y-6">
            {props.children}
          </div>
        </Container>
      </main>
    </div>
  );
};

export default Frame;
