import DashboardLayout from '../../components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { AlertTriangle, ShieldAlert, TrendingUp, Users } from 'lucide-react';

export default function AdminUsageAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['adminUsageAlerts'],
    queryFn: async () => {
      const res = await api.get('/admin/usage-alerts');
      return res.data.data;
    },
    refetchInterval: 10000 // Refetch every 10 seconds for real-time monitoring
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Monitoring</h1>
          <p className="text-muted-foreground">Real-time alerts for users approaching or exceeding their daily limits.</p>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center animate-pulse text-muted-foreground">
            Analyzing global usage patterns...
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center text-green-700">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">✓</div>
            <h3 className="text-lg font-bold">Safe Consumption</h3>
            <p>No users are currently exceeding 80% usage or suspended for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.map((alert: any) => (
              <div key={alert.userId} className={`bg-background border rounded-lg overflow-hidden shadow-sm flex flex-col ${alert.isSuspended ? 'border-red-500' : 'border-amber-500'}`}>
                <div className={`p-4 flex items-center justify-between ${alert.isSuspended ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
                    {alert.isSuspended ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                    {alert.isSuspended ? 'Suspended' : 'Quota Warning'}
                  </div>
                  <div className="text-xs font-mono">{alert.percent}%</div>
                </div>
                <div className="p-4 flex-1 space-y-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">{alert.email}</div>
                    <div className="text-xs text-muted-foreground">Plan: {alert.plan}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Consumption</span>
                      <span className="font-mono">{alert.consumed} / {alert.limit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                       <div 
                         className={`h-2 rounded-full ${alert.isSuspended ? 'bg-red-500' : alert.percent >= 95 ? 'bg-red-500' : 'bg-amber-500'}`} 
                         style={{ width: `${Math.min(alert.percent, 100)}%` }} 
                       />
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border-t flex justify-end">
                  <button className="text-xs font-bold text-primary hover:underline">Manage Account</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-background border rounded-lg p-6 flex items-start gap-4">
               <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                  <TrendingUp size={24} />
               </div>
               <div>
                  <h4 className="font-bold">Usage Thresholds</h4>
                  <p className="text-sm text-muted-foreground mt-1">Users receive automated email notifications at 80% and 95%. Custom Enterprise limits take precedence over standard plan limits.</p>
               </div>
            </div>
            <div className="bg-background border rounded-lg p-6 flex items-start gap-4">
               <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
                  <Users size={24} />
               </div>
               <div>
                  <h4 className="font-bold">Active Shielding</h4>
                  <p className="text-sm text-muted-foreground mt-1">Suspended users are blocked at the authentication layer before any geography queries are processed, saving server compute.</p>
               </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
