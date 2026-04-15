import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuthStore } from '../../store/authStore';
import { Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClientPortal() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['portalStats'],
    queryFn: async () => {
      const res = await api.get('/portal/stats');
      return res.data.data;
    }
  });

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center text-muted-foreground animate-pulse">
          Loading portal statistics...
        </div>
      </DashboardLayout>
    );
  }

  const { todayRequests, dailyLimit, monthRequests, avgResponseTime, successRate, callsOverTime } = stats;
  const usagePercentage = Math.min((todayRequests / (dailyLimit === 'Unlimited' ? 1000000 : dailyLimit)) * 100, 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back{user?.businessName ? `, ${user.businessName}` : ''}!</h1>
          <p className="text-muted-foreground">Manage your API keys and view usage.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Today's Requests</h3>
            <div className="mt-2 text-3xl font-bold text-primary">
              {todayRequests.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {dailyLimit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-4">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
            </div>
          </div>
          
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Monthly Requests</h3>
            <div className="mt-2 text-3xl font-bold">{monthRequests.toLocaleString()}</div>
          </div>
          
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Response Time</h3>
            <div className="mt-2 text-3xl font-bold">{avgResponseTime}ms</div>
          </div>

          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Success Rate</h3>
            <div className="mt-2 text-3xl font-bold text-green-600">{successRate}%</div>
          </div>
        </div>

        {/* Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-background border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium mb-6">Usage History (7 Days)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={callsOverTime}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
            
            <div className="mb-6 p-4 rounded-md border border-primary/20 bg-primary/5">
              <div className="text-sm font-medium text-primary mb-1">Current Plan: {user?.plan}</div>
              <div className="text-xs text-muted-foreground">
                {user?.plan === 'FREE' ? 'You are on the free tier with 100 requests per day limit.' : 'You have access to extended rate limits.'}
              </div>
              <button className="mt-3 w-full py-1.5 bg-primary/10 text-primary rounded text-sm font-medium hover:bg-primary/20 transition-colors">
                Upgrade Plan
              </button>
            </div>

            <div className="space-y-3">
              <Link to="/portal/keys" className="flex items-center gap-3 w-full p-3 border rounded-md hover:bg-muted/50 transition-colors text-left text-sm font-medium">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Key size={18} />
                </div>
                <div>
                  <div className="text-foreground">Manage API Keys</div>
                  <div className="text-xs text-muted-foreground">Create and revoke access tokens</div>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
