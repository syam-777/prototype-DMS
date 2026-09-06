import { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, FileText, Upload, Search, Activity, LogOut, Menu, X } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import RoleBadge from './RoleBadge';

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', href: '/documents', icon: FileText },
    ...((user?.role === 'investigator' || user?.role === 'admin') ? [{ name: 'Upload', href: '/documents/upload', icon: Upload }] : []),
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Audit Log', href: '/audit', icon: Activity },
  ];

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl h-screen sticky top-0">
        <div className="flex items-center p-6 mb-4">
          <Shield className="h-8 w-8 text-green-500 mr-3" />
          <span className="text-xl font-bold tracking-wide">SecureVault</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => {
            const active = location.pathname.startsWith(item.href) && (item.href !== '/documents' || location.pathname === '/documents' || location.pathname.startsWith('/documents/'));
            // Hack for active state since paths overlap slightly
            const isActive = location.pathname === item.href || (item.href === '/documents' && location.pathname.startsWith('/documents') && location.pathname !== '/documents/upload');
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex flex-col space-y-3 mb-4">
            <span className="text-sm font-medium">{user?.username}</span>
            <RoleBadge role={user?.role} />
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <Outlet />
      </div>
    </div>
  );
}
