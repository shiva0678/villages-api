import { Link, useLocation } from 'react-router-dom';
import { 
  Users, BarChart3, Settings, Key, 
  Map, LogOut, Menu, Bell, MapPin, AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

// These would normally be conditional based on user role limit
const adminNav: NavItem[] = [
  { name: 'Analytics', href: '/admin', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Usage Monitoring', href: '/admin/usage-alerts', icon: AlertCircle },
  { name: 'Villages', href: '/admin/villages', icon: MapPin },
  { name: 'API Logs', href: '/admin/logs', icon: Settings },
];

const clientNav: NavItem[] = [
  { name: 'Dashboard', href: '/portal', icon: BarChart3 },
  { name: 'API Keys', href: '/portal/keys', icon: Key },
  { name: 'Documentation', href: '/portal/docs', icon: Map },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  // Decide which nav to show
  const isAdmin = location.pathname.startsWith('/admin') || user?.role === 'ADMIN';
  const navigation = isAdmin ? adminNav : clientNav;

  return (
    <div className="flex h-screen bg-muted/30">
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && <span className="font-bold text-lg text-primary">Villages API</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-muted text-muted-foreground">
            <Menu size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-background border-b flex items-center justify-between px-6">
          <div className="flex items-center text-sm text-muted-foreground">
            {/* Breadcrumb would go here */}
            {location.pathname.split('/').filter(Boolean).join(' / ')}
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  );
}
