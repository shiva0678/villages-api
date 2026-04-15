import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Copy, Trash2, Key, AlertTriangle } from 'lucide-react';

export default function ClientKeys() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: keys, isLoading } = useQuery({
    queryKey: ['portalKeys'],
    queryFn: async () => {
      const res = await api.get('/portal/keys');
      return res.data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/portal/keys', { name });
      return res.data.data;
    },
    onSuccess: (data) => {
      setGeneratedSecret(data.secret);
      setNewKeyName('');
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['portalKeys'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create key');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/portal/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalKeys'] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newKeyName.trim()) return;
    createMutation.mutate(newKeyName);
  };

  const handleRevoke = (id: number) => {
    if (confirm('Are you sure you want to revoke this API feature? This action cannot be undone and will immediately break any apps using it.')) {
      revokeMutation.mutate(id);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const columns = [
    { key: 'name', header: 'Key Name' },
    { 
      key: 'key', 
      header: 'API Key',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">{row.key}</code>
          <button 
            onClick={() => handleCopy(row.key)}
            className="text-muted-foreground hover:text-foreground"
            title="Copy Key"
          >
            <Copy size={16} />
          </button>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      header: 'Created On',
      render: (row: any) => new Date(row.createdAt).toLocaleDateString()
    },
    { 
      key: 'lastUsedAt', 
      header: 'Last Used',
      render: (row: any) => row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString() : 'Never'
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <button 
          onClick={() => handleRevoke(row.id)}
          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Revoke Key"
        >
          <Trash2 size={18} />
        </button>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground">Manage your secure access credentials.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md text-sm flex items-center gap-2"
          >
            <Key size={16} />
            Generate New Key
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-md p-4 text-sm flex items-center gap-3">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* Modal for Creating Key */}
        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Create API Key</h3>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Key Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. Production Server"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Showing Generated Secret (ONCE) */}
        {generatedSecret && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-lg p-8">
              <div className="flex items-center gap-3 text-amber-500 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-foreground">Save your API Secret!</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Please copy your secret key now. This is the <strong>only time</strong> it will be shown. 
                If you lose it, you will need to generate a new API key.
              </p>
              
              <div className="bg-muted p-4 rounded-md mb-6 relative group">
                <code className="font-mono text-sm break-all">{generatedSecret}</code>
                <button 
                  onClick={() => handleCopy(generatedSecret)}
                  className="absolute top-2 right-2 p-2 bg-background border rounded hover:bg-muted-foreground/10"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setGeneratedSecret(null)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                  I've securely stored it
                </button>
              </div>
            </div>
          </div>
        )}

        <DataTable columns={columns} data={keys || []} isLoading={isLoading} />
        
        <div className="bg-muted/50 border rounded-lg p-6 mt-8">
          <h4 className="font-medium flex items-center gap-2">
            <ShieldAlert className="text-primary" size={20} />
            Security Best Practices
          </h4>
          <ul className="list-disc pl-5 mt-3 text-sm text-muted-foreground space-y-1">
            <li>Never embed your API Key directly in client-side code (Browser, Mobile App).</li>
            <li>Store your keys securely in environment variables (e.g., <code>.env</code> file).</li>
            <li>Do not commit keys to GitHub or version control.</li>
            <li>If you suspect a key has been compromised, revoke it immediately.</li>
          </ul>
        </div>

      </div>
    </DashboardLayout>
  );
}

// Dummy icon for the security blurb
const ShieldAlert = ({ className, size }: { className: string, size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 22-7-3.5v-8l7-3.5 7 3.5v8z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
