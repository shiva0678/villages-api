import DashboardLayout from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function AdminLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: async () => {
      const res = await api.get('/admin/logs');
      return res.data.data;
    }
  });

  const columns = [
    { 
      key: 'timestamp', 
      header: 'Time',
      render: (row: any) => new Date(row.timestamp).toLocaleString()
    },
    { key: 'user', header: 'Client' },
    { 
      key: 'method', 
      header: 'Method',
      render: (row: any) => (
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {row.method}
        </span>
      )
    },
    { key: 'endpoint', header: 'Endpoint' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: any) => {
        let color = 'bg-gray-100 text-gray-700';
        if (row.status >= 200 && row.status < 300) color = 'bg-green-100 text-green-700';
        if (row.status >= 400 && row.status < 500) color = 'bg-amber-100 text-amber-700';
        if (row.status >= 500) color = 'bg-red-100 text-red-700';
        return (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>
            {row.status}
          </span>
        );
      }
    },
    { 
      key: 'timeMs', 
      header: 'Latency',
      render: (row: any) => (
        <span className={`${row.timeMs > 500 ? 'text-red-500 font-medium' : ''}`}>
          {row.timeMs}ms
        </span>
      )
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Logs Viewer</h1>
          <p className="text-muted-foreground">Monitor real-time API requests and debug issues.</p>
        </div>

        <DataTable columns={columns} data={logs || []} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
