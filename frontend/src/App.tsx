import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUsageAlerts from './pages/admin/AdminUsageAlerts';
import AdminVillages from './pages/admin/AdminVillages';
import AdminLogs from './pages/admin/AdminLogs';
import ClientPortal from './pages/client/ClientPortal';
import ClientKeys from './pages/client/ClientKeys';
import ClientDocs from './pages/client/ClientDocs';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background font-sans text-foreground">
          <Routes>
            {/* Redirect root to /login for now */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/usage-alerts" element={<AdminUsageAlerts />} />
            <Route path="/admin/villages" element={<AdminVillages />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            
            {/* Client Routes */}
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/portal/keys" element={<ClientKeys />} />
            <Route path="/portal/docs" element={<ClientDocs />} />
            
            {/* 404 */}
            <Route path="*" element={<div className="p-8 text-center bg-background min-h-screen flex flex-col items-center justify-center"><h1 className="text-4xl font-bold text-primary">404</h1><p className="text-muted-foreground mt-2">Page Not Found</p></div>} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
