'use client';

import { useMedplumProfile } from '@medplum/react';
import Link from 'next/link';
import {
  ClipboardList,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const profile = useMedplumProfile();
  const displayName = profile?.name?.[0]?.given?.[0] || 'there';

  // Placeholder stats - these will be populated with real data later
  const stats = [
    {
      title: 'Pending Reviews',
      value: '—',
      description: 'Refills awaiting action',
      icon: ClipboardList,
      href: '/queue',
      color: 'text-blue-600',
    },
    {
      title: 'Patients at Risk',
      value: '—',
      description: 'PDC below 80%',
      icon: AlertTriangle,
      href: '/patients?filter=at-risk',
      color: 'text-amber-600',
    },
    {
      title: 'Active Patients',
      value: '—',
      description: 'With active medications',
      icon: Users,
      href: '/patients',
      color: 'text-green-600',
    },
    {
      title: 'Avg PDC Score',
      value: '—',
      description: 'Across all measures',
      icon: TrendingUp,
      href: '/analytics',
      color: 'text-purple-600',
    },
  ];

  const quickActions = [
    {
      title: 'Review Refill Queue',
      description: 'Process pending medication refill requests',
      href: '/queue',
      primary: true,
    },
    {
      title: 'View At-Risk Patients',
      description: 'Patients with adherence below threshold',
      href: '/patients?filter=at-risk',
      primary: false,
    },
    {
      title: 'Analytics Dashboard',
      description: 'View PDC trends and HEDIS metrics',
      href: '/analytics',
      primary: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your medication adherence metrics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant={action.primary ? 'default' : 'outline'}
                  className="w-full"
                  asChild
                >
                  <Link href={action.href}>
                    Go to {action.title.split(' ')[0]}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Setup notice */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Getting Started</CardTitle>
          <CardDescription>
            Complete these steps to start using Ignite Health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                ✓
              </div>
              <span>Medplum authentication configured</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
                2
              </div>
              <span className="text-muted-foreground">Load patient data (Synthea or import)</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
                3
              </div>
              <span className="text-muted-foreground">Configure PDC calculation bot</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
                4
              </div>
              <span className="text-muted-foreground">Set up AI recommendations (optional)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
