import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function AdminVillages() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  const { data, isLoading } = useQuery({
    queryKey: ['adminVillages', page, limit],
    queryFn: async () => {
      const res = await api.get(`/admin/villages?page=${page}&limit=${limit}`);
      return res.data;
    }
  });

  const columns = [
    { key: 'code', header: 'Village Code' },
    { key: 'name', header: 'Village Name' },
    { key: 'subDistrict', header: 'Sub-District' },
    { key: 'district', header: 'District' },
    { key: 'state', header: 'State' },
  ];

  const totalPages = data?.meta?.totalPages || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Village Master List</h1>
          <p className="text-muted-foreground">Browse all geographic records imported into the system.</p>
        </div>

        <div className="flex justify-between items-center bg-background border p-4 rounded-lg shadow-sm">
          <div className="text-sm font-medium">
            Total Records: <span className="text-primary">{data?.meta?.total?.toLocaleString() || '...'}</span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border py-1 px-2 rounded text-sm"
            >
              <option value="100">100 per page</option>
              <option value="500">500 per page</option>
              <option value="5000">5,000 per page</option>
            </select>
          </div>
        </div>

        <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} />

        {/* Pagination Controls */}
        <div className="flex justify-between items-center py-4">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-background border rounded-md disabled:opacity-50 text-sm font-medium"
          >
            Previous
          </button>
          <span className="text-sm">Page {page} of {totalPages.toLocaleString()}</span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-background border rounded-md disabled:opacity-50 text-sm font-medium"
          >
            Next
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
