import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Package, Menu, X, LogOut, BarChart2, BriefcaseBusiness } from 'lucide-react';
import { useUser, useClerk } from '@clerk/clerk-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/drivers', label: 'Drivers', icon: Truck },
  { to: '/loads', label: 'Loads', icon: Package },
  { to: '/brokers', label: 'Brokers', icon: BriefcaseBusiness },
  { to: '/resume', label: 'Resume', icon: BarChart2 },
];

export default function Layout({ children }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      
      {/* SIDEBAR PARA ESCRITORIO (Oculto en móvil) */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200">
        <NavLink to="/" className="flex items-center gap-2 px-5 py-5 border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <Truck className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-800">Load Tracker</span>
        </NavLink>
        <nav className="flex-1 py-3 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        
        {/* HEADER SUPERIOR PARA MÓVIL (Oculto en escritorio) */}
        <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:hidden shrink-0">
          <NavLink to="/" className="flex items-center gap-2 rounded-md hover:bg-gray-50 transition-colors">
            <Truck className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-800">Load Tracker</span>
          </NavLink>
          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* ÁREA DE SCROLL (Las páginas) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* BARRA DE NAVEGACIÓN INFERIOR FIJA PARA MÓVIL */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-50">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-1 w-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-6 w-6 mb-0.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

      </div>
    </div>
  );
}
