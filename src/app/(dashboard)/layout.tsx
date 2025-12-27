'use client';

import { useEffect } from 'react';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  LogOut,
  Pill,
  Code2,
  Database,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Refill Queue', href: '/queue', icon: ClipboardList },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const devTools = [
  { name: 'FHIR Explorer', href: '/dev/explorer', icon: Database },
  { name: 'Search Playground', href: '/dev/search', icon: Search },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!medplum.isLoading() && !profile) {
      router.push('/login');
    }
  }, [medplum, profile, router]);

  const handleLogout = async () => {
    await medplum.signOut();
    router.push('/login');
  };

  // Show loading while checking auth
  if (medplum.isLoading()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!profile) {
    return null;
  }

  const displayName = profile.name?.[0]?.given?.[0] || 'User';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="bg-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Pill className="text-primary h-6 w-6" />
          <span className="text-lg font-semibold">Ignite Health</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Developer Tools Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2 px-3 py-2">
              <Code2 className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Developer Tools
              </span>
            </div>
            <div className="space-y-1">
              {devTools.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium">{displayName}</p>
                <p className="text-muted-foreground text-xs">Clinical Staff</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
