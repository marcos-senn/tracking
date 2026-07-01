import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/drivers', label: 'Drivers', icon: Truck },
  { to: '/loads', label: 'Loads', icon: Package },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Hooks de Clerk para obtener el usuario y la función de cerrar sesión
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200">
          <Truck className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-800">Load Tracker</span>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <div className="text-xs text-gray-500 truncate px-3 mb-2">
            {user?.primaryEmailAddress?.emailAddress}
          </div>
          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-gray-100">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="ml-3 font-semibold text-gray-800">Load Tracker</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}