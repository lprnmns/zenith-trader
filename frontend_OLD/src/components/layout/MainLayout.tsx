// src/components/layout/MainLayout.tsx
import { Outlet, Link } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <main className="container mx-auto p-4">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
