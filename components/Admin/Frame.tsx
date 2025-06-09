import React, { ReactNode, useState, useEffect } from "react";
import * as z from "zod";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Menu,
  X,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

import Sidebar from "./Sidebar";
import SystemStatusIndicator from "./SystemStatusIndicator";
import NotificationDropdown from "./NotificationDropdown";
import UserMenu from "./UserMenu";
import DisplayStatusCard from "./DisplayStatusCard";
import { useDisplayContext } from "../../contexts/DisplayContext";
import { useQuery } from "@tanstack/react-query";

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch current user data
  const { data: currentUser } = useQuery({
    queryKey: ["auth-status"],
    queryFn: async () => {
      const response = await fetch("/api/auth/status");
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data.authenticated ? data.user : null;
    },
    enabled: !!props.loggedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animated gradient background for the sidebar header
  const headerGradient = "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5";

  return (
    <div className='flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20 transition-all duration-500'>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden'
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sophisticated Sidebar */}
      {props.loggedIn && (
        <aside
          className={cn(
            "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
            "bg-card/50 backdrop-blur-xl border-r border-border/50",
            "transition-all duration-500 ease-out",
            "shadow-xl lg:shadow-none",
            collapsed ? "w-[70px]" : "w-[280px]",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Enhanced Header with Glass Effect */}
          <Card className={cn(
            "m-3 mb-0 border-0 shadow-sm",
            headerGradient,
            "backdrop-blur-sm relative overflow-hidden"
          )}>
            <div className='absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-50' />
            <CardContent className='p-4 relative'>
              <div className={cn(
                "flex items-center",
                collapsed ? "justify-center" : "justify-between"
              )}>
                <div className={cn(
                  "flex items-center gap-3 transition-all duration-300",
                  collapsed ? "justify-center w-full" : ""
                )}>
                  <div className='relative'>
                    <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg'>
                      <Monitor className='w-5 h-5 text-primary-foreground' />
                    </div>
                    {mounted && (
                      <div className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse' />
                    )}
                  </div>
                  {!collapsed && (
                    <div className='transition-all duration-300'>
                      <div className='flex items-center gap-4'>
                        <h2 className='font-bold text-lg text-foreground tracking-tight'>
                          Digital Signage
                        </h2>
                        <Sparkles className='w-4 h-4 text-primary' />
                      </div>
                      <p className='text-xs text-muted-foreground font-medium'>
                        Management System
                      </p>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setCollapsed(true)}
                    className='h-8 w-8 hover:bg-primary/10 transition-all duration-200'
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Container */}
          <div className='flex-1 px-3 pb-3'>
            <Sidebar
              loggedIn={props.loggedIn}
              displayId={state.id}
              collapsed={collapsed}
            />
          </div>

          {/* Expand Button - Enhanced */}
          {collapsed && (
            <div className='absolute bottom-6 left-4'>
              <Button
                variant='outline'
                size='icon'
                onClick={() => setCollapsed(false)}
                className='h-10 w-10 rounded-full shadow-lg border-primary/20 bg-card/80 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 transition-all duration-300'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          )}

          {/* Mobile Close Button */}
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setMobileMenuOpen(false)}
            className='absolute top-4 right-4 lg:hidden h-8 w-8'
          >
            <X className='h-4 w-4' />
          </Button>
        </aside>
      )}

      {/* Enhanced Main Content Area */}
      <main className='flex-1 flex flex-col min-w-0'>
        {/* Sophisticated Header */}
        <Card className='m-0 rounded-none border-0 border-b border-border/50 bg-card/30 backdrop-blur-xl shadow-sm'>
          <CardContent className='px-6 py-0 h-16 flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {/* Mobile Menu Button */}
              {props.loggedIn && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setMobileMenuOpen(true)}
                  className='lg:hidden h-8 w-8'
                >
                  <Menu className='h-4 w-4' />
                </Button>
              )}
              
              {/* Page Title with Animation */}
              {props.title && (
                <div className='flex items-center gap-3'>
                  <div className='h-6 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full' />
                  <h1 className='text-xl font-semibold text-foreground tracking-tight'>
                    {props.title}
                  </h1>
                </div>
              )}
            </div>

            {/* Header Actions */}
            {props.loggedIn && (
              <div className='flex items-center gap-4'>
                {/* Dynamic System Status Indicator */}
                <SystemStatusIndicator />

                {/* Functional Notifications */}
                <NotificationDropdown />

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* User Menu with Dropdown */}
                <UserMenu user={currentUser} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Area with Enhanced Styling */}
        <div className='flex-1 overflow-y-auto'>
          <Container className='py-8 px-6 max-w-7xl'>
            {/* Display Status Card - Only show on admin pages */}
            {props.loggedIn && (
              <div className='mb-6'>
                <DisplayStatusCard />
              </div>
            )}

            {/* Content Wrapper Card */}
            <Card className='min-h-[calc(100vh-12rem)] bg-card/40 backdrop-blur-sm border-border/50 shadow-sm'>
              <CardContent className='p-8'>
                <div className='space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-700'>
                  {props.children}
                </div>
              </CardContent>
            </Card>
          </Container>
        </div>
      </main>
    </div>
  );
};

export default Frame;
