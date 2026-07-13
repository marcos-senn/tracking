import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Package, MapPin, DollarSign, CalendarCheck, CalendarClock, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

const statusColors = {
  'Available': 'bg-emerald-100 text-emerald-700',
  'En Route': 'bg-blue-100 text-blue-700',
  'Off Duty': 'bg-gray-100 text-gray-600',
  'Booked': 'bg-purple-100 text-purple-700',
  'En Route to PU': 'bg-orange-100 text-orange-700',
  'At Pickup': 'bg-yellow-100 text-yellow-700',
  'En Route to DEL': 'bg-blue-100 text-blue-700',
  'At Delivery': 'bg-cyan-100 text-cyan-700',
  'Delivered': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const API_BASE = 'https://load-tracker-api-lfau.onrender.com/api';

const getFormattedDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateValue = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const token = await getToken();
      const [dRes, lRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/drivers`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/loads`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const dData = await dRes.json();
      const lData = await lRes.json();
      const sData = await sRes.json();

      const loadsWithNames = lData.loads.map(load => {
        const driver = dData.drivers.find(d => d._id === load.driverId);
        return { ...load, driverName: driver ? driver.driver : 'Unassigned', truck: driver ? driver.truck : '—' };
      });

      setDrivers(dData.drivers);
      setLoads(loadsWithNames);
      setRevenue(sData.totalRevenue || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresca datos cada 30 segundos para mantener el dashboard actualizado
    const interval = setInterval(fetchData, 30000);
    
    // Refresca cuando la página vuelve a ser visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getToken]);

  const handleResetRevenue = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/settings/reset`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRevenue(data.totalRevenue);
      toast.success('Revenue restablecido a $0');
    } catch (error) {
      toast.error('Error al restablecer revenue');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const today = getFormattedDate(0);
  const tomorrow = getFormattedDate(1);
  const dayAfter = getFormattedDate(2);

  const available = drivers.filter(d => d.status === 'Available').length;
  const activeLoadsList = loads.filter(l => l.status !== 'Delivered' && l.status !== 'Cancelled');
  
  const pickupsToday = activeLoadsList.filter(l => normalizeDateValue(l.puDate) === today);
  const deliveriesToday = activeLoadsList.filter(l => normalizeDateValue(l.delDate) === today);
  
  const focusTodayIds = new Set();
  activeLoadsList.forEach(l => {
    if (normalizeDateValue(l.puDate) === today || normalizeDateValue(l.delDate) === today) focusTodayIds.add(l._id);
  });
  const focusToday = activeLoadsList.filter(l => focusTodayIds.has(l._id));
  
  const upcomingEvents = [];
  activeLoadsList.forEach(l => {
    const puDate = normalizeDateValue(l.puDate);
    const delDate = normalizeDateValue(l.delDate);

    if (puDate === tomorrow || puDate === dayAfter) {
      upcomingEvents.push({ ...l, type: 'PU', date: puDate, time: l.puTimeFrom, city: l.puCity });
    }
    if (delDate === tomorrow || delDate === dayAfter) {
      upcomingEvents.push({ ...l, type: 'DEL', date: delDate, time: l.delTimeFrom, city: l.delCity });
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Truck} label="Total Drivers" value={drivers.length} color="text-blue-600" />
        <StatCard icon={Truck} label="Available" value={available} color="text-emerald-600" />
        <StatCard icon={Package} label="Active Loads" value={activeLoadsList.length} color="text-orange-600" />
        
        {/* Tarjeta de Revenue con botón de Reset */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">Revenue (Mes)</p>
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-gray-800">${revenue.toLocaleString()}</p>
            <button onClick={handleResetRevenue} title="Restablecer a $0" className="text-gray-400 hover:text-red-600 transition-colors p-1">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <StatCard icon={CalendarCheck} label="PU Hoy" value={pickupsToday.length} color="text-purple-600" />
        <StatCard icon={CalendarClock} label="DEL Hoy" value={deliveriesToday.length} color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">El Foco de Hoy</h3>
          </div>
          <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
            {focusToday.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No hay cargas programadas para hoy. ¡Buen trabajo!</p>
            ) : (
              focusToday.map(load => (
                <div key={load._id} className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base text-indigo-600">{load.driverName}</div>
                    <div className="text-xs text-gray-500 mb-2">Load #{load.loadNumber}</div>
                    <div className="text-xs text-gray-600 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      {load.puDate === today && (
                        <span className="flex items-center gap-1 font-medium text-purple-700">
                          <ArrowRight className="h-3 w-3" /> PU: {load.puTimeFrom || '--:--'} - {load.puCity}
                        </span>
                      )}
                      {load.delDate === today && (
                        <span className="flex items-center gap-1 font-medium text-red-700">
                          <MapPin className="h-3 w-3" /> DEL: {load.delTimeFrom || '--:--'} - {load.delCity}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-4 ${statusColors[load.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {load.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Próximos Eventos</h3>
          </div>
          <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No hay eventos próximos.</p>
            ) : (
              upcomingEvents.map((load, index) => (
                <div
                  key={index}
                  role="button"
                  onClick={() => navigate(`/loads?loadId=${load._id}`)}
                  className="cursor-pointer p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-sm text-indigo-600">{load.driverName}</div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${load.type === 'PU' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                      {load.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Load #{load.loadNumber}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {load.city}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-medium">
                    {load.date === tomorrow ? 'Mañana' : 'Pasado mañana'} - {load.time || '--:--'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Active Loads</h3>
          </div>
          <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
            {activeLoadsList.length === 0 ? (
              <p className="text-sm text-gray-500">No active loads</p>
            ) : (
              activeLoadsList.slice(0, 10).map(load => (
                <div key={load._id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-indigo-600">{load.driverName}</div>
                    <div className="text-xs text-gray-500 mt-1">Load #{load.loadNumber}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {load.puCity} <ArrowRight className="h-3 w-3" /> {load.delCity}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[load.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {load.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Driver Status</h3>
          </div>
          <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
            {drivers.length === 0 ? (
              <p className="text-sm text-gray-500">No drivers found</p>
            ) : (
              drivers.map(driver => (
                <div key={driver._id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <div className="font-bold text-sm text-indigo-600">{driver.driver}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {driver.company} · Truck {driver.truck}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[driver.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                    {driver.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <div className={`h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold mt-2 text-gray-800">{value}</p>
    </div>
  );
}
