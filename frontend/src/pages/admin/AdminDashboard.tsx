import DashboardLayout from '../../components/layout/DashboardLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const COLORS = ['hsl(var(--primary))', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data;
    }
  });

  if (isLoading || !stats) {
    return (
      <DashboardLayout>
        <div className="flex h-[80vh] items-center justify-center text-muted-foreground animate-pulse">
          Loading dashboard metrics...
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, callsOverTime, planDistribution } = stats;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground">Platform-wide API usage and metrics.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total API Calls (7d)</h3>
            <div className="mt-2 text-3xl font-bold text-primary">{metrics.totalApiLogs.toLocaleString()}</div>
          </div>
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Active B2B Clients</h3>
            <div className="mt-2 text-3xl font-bold">{metrics.totalUsers}</div>
            {metrics.pendingUsers > 0 && <p className="text-xs text-amber-500 mt-1">{metrics.pendingUsers} pending approval</p>}
          </div>
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total Villages indexed</h3>
            <div className="mt-2 text-3xl font-bold">{metrics.totalVillages.toLocaleString()}</div>
          </div>
          <div className="bg-background border rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Avg Response Time</h3>
            <div className="mt-2 text-3xl font-bold">{metrics.avgResponseTime}ms</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-background border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium mb-6">API Calls Over Time (Last 7 Days)</h3>
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

          {/* Pie Chart */}
          <div className="bg-background border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium mb-6">User Distribution by Plan</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planDistribution.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-sm mt-4">
                {planDistribution.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
