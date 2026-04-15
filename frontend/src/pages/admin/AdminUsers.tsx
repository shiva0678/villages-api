import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Check, X, ShieldAlert, Edit2, AlertCircle } from 'lucide-react';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { id, ...data } = updatedData;
      await api.put(`/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setEditingUser(null);
    }
  });

  const handleApprove = (id: number) => {
    mutation.mutate({ id, isActive: true });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    mutation.mutate(editingUser);
  };

  const columns = [
    { key: 'email', header: 'Email / Business' },
    { 
      key: 'plan', 
      header: 'Plan',
      render: (row: any) => (
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          {row.plan}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: any) => (
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-1 text-xs text-center font-medium rounded-full ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {row.isActive ? 'Active' : 'Pending Approval'}
          </span>
          {row.isSuspended && (
            <span className="px-2 py-1 text-[10px] text-center font-bold bg-amber-100 text-amber-700 rounded-full uppercase tracking-tighter">
              Suspended
            </span>
          )}
        </div>
      )
    },
    { 
      key: 'usage', 
      header: 'API Keys / Logs',
      render: (row: any) => (
        <span className="text-muted-foreground text-sm">
          {row._count.apiKeys} keys | {row._count.apiLogs} requests
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          {!row.isActive && (
            <button 
              onClick={() => handleApprove(row.id)}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Approve User"
            >
              <Check size={18} />
            </button>
          )}
          <button 
            onClick={() => setEditingUser(row)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded" 
            title="Edit Plan & Limits"
          >
            <Edit2 size={18} />
          </button>
          <button className="p-1 text-primary hover:bg-primary/50 rounded" title="Manage State Access">
            <ShieldAlert size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Approve B2B clients and manage tiered quotas.</p>
          </div>
        </div>

        <DataTable columns={columns} data={users || []} isLoading={isLoading} />

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Client: {editingUser.email}</h3>
                <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tier / Plan</label>
                    <select 
                      value={editingUser.plan}
                      onChange={(e) => setEditingUser({...editingUser, plan: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="FREE">FREE ($0)</option>
                      <option value="PREMIUM">PREMIUM ($49)</option>
                      <option value="PRO">PRO ($199)</option>
                      <option value="UNLIMITED">UNLIMITED ($499)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Status</label>
                    <div className="flex items-center gap-4 mt-2">
                       <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={editingUser.isActive}
                           onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                         /> Approved
                       </label>
                       <label className="flex items-center gap-1.5 text-sm cursor-pointer text-red-600">
                         <input 
                           type="checkbox" 
                           checked={editingUser.isSuspended}
                           onChange={(e) => setEditingUser({...editingUser, isSuspended: e.target.checked})}
                         /> Suspended
                       </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-muted/50 rounded-md border border-dashed border-muted-foreground/30">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle size={14} /> Custom Limit Overrides
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Daily Requests</label>
                      <input 
                        type="number"
                        value={editingUser.customDailyLimit || ''}
                        placeholder="Default for tier"
                        onChange={(e) => setEditingUser({...editingUser, customDailyLimit: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Burst (per min)</label>
                      <input 
                        type="number"
                        value={editingUser.customBurstLimit || ''}
                        placeholder="Default for tier"
                        onChange={(e) => setEditingUser({...editingUser, customBurstLimit: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingUser.autoSuspendEnabled}
                      onChange={(e) => setEditingUser({...editingUser, autoSuspendEnabled: e.target.checked})}
                    /> Enable 100% Auto-Suspension
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-top">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={mutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    {mutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
