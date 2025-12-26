'use client';

import { useMedplum, useMedplumProfile } from '@medplum/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

  // Placeholder stats - will be replaced with real data
  const stats = [
    {
      title: 'Pending Reviews',
      value: '—',
      description: 'Refills awaiting review',
      icon: ClipboardList,
      href: '/queue',
      color: 'text-blue-600',
    },
    {
      title: 'Active Patients',
      value: '—',
      description: 'In medication programs',
      icon: Users,
      href: '/patients',
      color: 'text-green-600',
    },
    {
      title: 'Urgent Items',
      value: '—',
      description: 'Require immediate attention',
      icon: AlertTriangle,
      href: '/queue?priority=urgent',
      color: 'text-orange-600',
    },
    {
      title: 'Completed Today',
      value: '—',
      description: 'Reviews processed',
      icon: CheckCircle,
      href: '/analytics',
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.name?.[0]?.given?.[0] || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your medication adherence program today.
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">System Status</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="mr-1 h-3 w-3" />
              Connected to Medplum
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Project ID: </span>
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {process.env.NEXT_PUBLIC_MEDPLUM_PROJECT_ID?.slice(0, 8)}...
              </code>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">User: </span>
              <span>{profile?.name?.[0]?.given?.join(' ')} {profile?.name?.[0]?.family}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to help you manage medication adherence
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/queue">
            <Button variant="outline" className="w-full justify-between">
              Review Refill Queue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/patients">
            <Button variant="outline" className="w-full justify-between">
              View All Patients
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" className="w-full justify-between">
              View Analytics
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This is the Ignite Health Command Center. Once configured, you'll see:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Real-time refill review queue with AI recommendations</li>
            <li>Patient PDC scores and adherence trends</li>
            <li>Safety alerts for drug interactions and contraindications</li>
            <li>Analytics dashboard for HEDIS Star Rating metrics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
