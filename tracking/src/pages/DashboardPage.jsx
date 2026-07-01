import { useEffect, useState } from 'react';
import { Truck, Package, MapPin, DollarSign, CalendarCheck, CalendarClock, ArrowRight } from 'lucide-react';

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

const API_DRIVERS = 'https://load-tracker-api-lfau.onrender.com/api/drivers';
const API_LOADS = 'https://load-tracker-api-lfau.onrender.com/api/loads';

const getFormattedDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = getFormattedDate(0);
const tomorrow = getFormattedDate(1);
const dayAfter = getFormattedDate(2);

export default function DashboardPage() {
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, lRes] = await Promise.all([fetch(API_DRIVERS), fetch(API_LOADS)]);
        const dData = await dRes.json();
        const lData = await lRes.json();

        const loadsWithNames = lData.loads.map(load => {
          const driver = dData.drivers.find(d => d._id === load.driverId);
          return { ...load, driverName: driver ? driver.driver : 'Unassigned', truck: driver ? driver.truck : '—' };
        });

        setDrivers(dData.drivers);
        setLoads(loadsWithNames);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const available = drivers.filter(d => d.status === 'Available').length;
  const activeLoadsList = loads.filter(l => l.status !== 'Delivered' && l.status !== 'Cancelled');
  const totalRevenue = loads.reduce((s, l) => s + (l.rate || 0), 0);
  
  const pickupsToday = activeLoadsList.filter(l => l.puDate === today);
  const deliveriesToday = activeLoadsList.filter(l => l.delDate === today);
  
  const focusTodayIds = new Set();
  activeLoadsList.forEach(l => {
    if (l.puDate === today || l.delDate === today) focusTodayIds.add(l._id);
  });
  const focusToday = activeLoadsList.filter(l => focusTodayIds.has(l._id));
  const upcomingDeliveries = activeLoadsList.filter(l => l.delDate === tomorrow || l.delDate === dayAfter);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Truck} label="Total Drivers" value={drivers.length} color="text-blue-600" />
        <StatCard icon={Truck} label="Available" value={available} color="text-emerald-600" />
        <StatCard icon={Package} label="Active Loads" value={activeLoadsList.length} color="text-orange-600" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-emerald-600" />
        <StatCard icon={CalendarCheck} label="PU Hoy" value={pickupsToday.length} color="text-purple-600" />
        <StatCard icon={CalendarClock} label="DEL Hoy" value={deliveriesToday.length} color="text-red-600" />
      </div>

      {/* Foco de Hoy y Próximos Eventos */}
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
            {upcomingDeliveries.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No hay eventos próximos.</p>
            ) : (
              upcomingDeliveries.map(load => (
                <div key={load._id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-bold text-sm text-indigo-600">{load.driverName}</div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusColors[load.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                      {load.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Load #{load.loadNumber}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {load.delCity}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-medium">
                    {load.delDate === tomorrow ? 'Mañana' : 'Pasado mañana'} - {load.delTimeFrom || '--:--'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Loads y Driver Status */}
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