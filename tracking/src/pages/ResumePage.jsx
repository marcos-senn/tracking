import { useEffect, useState, useMemo } from 'react';
import { MapPin, User, RotateCcw, BriefcaseBusiness, Search } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API_URL = 'https://load-tracker-api-lfau.onrender.com/api/resume';
const API_LOADS = 'https://load-tracker-api-lfau.onrender.com/api/loads';
const API_SETTINGS = 'https://load-tracker-api-lfau.onrender.com/api/settings';

function formatDate(d) {
  if (!d) return '';
  const cleanDate = String(d).substring(0, 10);
  const [y, m, day] = cleanDate.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${day}/${m}`;
}

function formatDateLocal(dateStr) {
  if (!dateStr) return '';
  const cleanDate = String(dateStr).substring(0, 10);
  const [year, month, day] = cleanDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

const getFormattedDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDate = (d) => d ? String(d).substring(0, 10) : null;

export default function ResumePage() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [allLoads, setAllLoads] = useState([]); // Estado para TODAS las cargas
  const [loading, setLoading] = useState(true);
  const [historyDriverFilter, setHistoryDriverFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const token = await getToken();
      // Hacemos 2 peticiones a la vez: los datos del resumen y todas las cargas
      const [res, loadsRes] = await Promise.all([
        fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(API_LOADS, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (!res.ok) throw new Error('No se pudo obtener la información del resumen');
      
      const d = await res.json();
      const loadsData = await loadsRes.json();
      
      setData(d);
      setAllLoads(loadsData.loads || []); // Guardamos todas las cargas
      setLoading(false);
    } catch (error) {
      console.error("Error fetching resume:", error);
      toast.error('Error al cargar los datos.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetCounter = async (type) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_SETTINGS}/reset`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type })
      });
      const newSettings = await res.json();
      setData(prev => ({ ...prev, counters: newSettings }));
      toast.success('Contador restablecido a 0');
    } catch (error) {
      toast.error('Error al restablecer');
    }
  };

  // Usamos todas las cargas para los gráficos (para que aparezcan el día que se crearon)
  const last7DaysRevenue = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = getFormattedDate(-i);
      const revenue = allLoads
        .filter(l => normalizeDate(l.createdAt) === dateStr)
        .reduce((sum, l) => sum + (Number(l.rate) || 0), 0);
      days.push({ date: dateStr, revenue });
    }
    return days;
  }, [allLoads]);

  const last4WeeksLoads = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const endOfWeek = new Date();
      endOfWeek.setHours(0, 0, 0, 0);
      endOfWeek.setDate(endOfWeek.getDate() - (i * 7));
      
      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(startOfWeek.getDate() - 6);

      const endStr = endOfWeek.toISOString().split('T')[0];
      const startStr = startOfWeek.toISOString().split('T')[0];

      const count = allLoads.filter(l => {
        const normDate = normalizeDate(l.createdAt);
        return normDate >= startStr && normDate <= endStr;
      }).length;
      
      weeks.push({ week: startStr, count });
    }
    return weeks;
  }, [allLoads]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return (
    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
      No se pudieron cargar los datos del resumen.
    </div>
  );

  const historyLoads = data.history || [];
  const historyDrivers = [...new Set(historyLoads.map((load) => load.driverName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const filteredHistory = historyLoads.filter((load) => {
    const matchesDriver = historyDriverFilter === 'all' || load.driverName === historyDriverFilter;
    
    if (!search) return matchesDriver;
    
    const s = search.toLowerCase();
    const matchesSearch = 
      load.loadNumber?.toLowerCase().includes(s) ||
      load.driverName?.toLowerCase().includes(s) ||
      load.brokerName?.toLowerCase().includes(s) ||
      load.puCity?.toLowerCase().includes(s) ||
      load.delCity?.toLowerCase().includes(s) ||
      load.status?.toLowerCase().includes(s);

    return matchesDriver && matchesSearch;
  });

  const revenueDays = last7DaysRevenue.filter((day) => day.revenue > 0);
  const averageDailyRevenue = revenueDays.length > 0
    ? revenueDays.reduce((total, day) => total + day.revenue, 0) / revenueDays.length
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Resume</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Cargas Completadas</h3>
            <button onClick={() => handleResetCounter('completed')} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Resetear contador">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-4xl font-bold text-emerald-600 mt-2">{data.counters?.completedLoads || 0}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Cargas Suspendidas</h3>
            <button onClick={() => handleResetCounter('suspended')} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Resetear contador">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-4xl font-bold text-red-600 mt-2">{data.counters?.suspendedLoads || 0}</p>
        </div>
      </div>

      <UserRevenueRanking users={data.userRevenueRanking || []} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <TopDestinations destinations={data.topDestinations || []} />
        <TopDrivers drivers={data.topDrivers || []} />
        <TopBrokers brokers={data.topBrokers || []} />
      </div>

      {/* GRÁFICO DE INGRESOS DIARIOS (DINÁMICO) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Daily Revenue (Últimos 7 días)</h3>
          {averageDailyRevenue !== null && (
            <p className="text-sm font-medium text-amber-700">Promedio por día con cargas: ${averageDailyRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          )}
        </div>
        {last7DaysRevenue.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue data yet</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7DaysRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatDate} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={v => `$${v.toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }} 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={formatDate}
                />
                {averageDailyRevenue !== null && (
                  <ReferenceLine y={averageDailyRevenue} stroke="#d97706" strokeDasharray="6 4" strokeWidth={2} />
                )}
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* GRÁFICO DE CARGAS SEMANALES (DINÁMICO) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 w-full overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Loads (Últimas 4 semanas)</h3>
        {last4WeeksLoads.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No load data yet</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last4WeeksLoads}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} tickFormatter={formatDate} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }} 
                  formatter={(value) => [value, 'Loads']}
                  labelFormatter={formatDate}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* HISTORIAL DE CARGAS CON BUSCADOR Y SCROLL */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Historial de Cargas</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                placeholder="Buscar load, ciudad, broker..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={historyDriverFilter}
              onChange={(event) => setHistoryDriverFilter(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los conductores</option>
              {historyDrivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No se encontraron cargas que coincidan con tu búsqueda.
          </p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredHistory.map(load => (
              <div key={load._id} className="p-4 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-800 break-words">#{load.loadNumber} - {load.driverName}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {load.puCity} → {load.delCity}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-x-4 gap-y-1 mt-2 text-xs">
                    {load.puDate && (
                      <span className="text-purple-700 font-medium">PU: {formatDateLocal(load.puDate)} {load.puTimeFrom || ''}</span>
                    )}
                    {load.delDate && (
                      <span className="text-red-700 font-medium">DEL: {formatDateLocal(load.delDate)} {load.delTimeFrom || ''}</span>
                    )}
                  </div>
                  {load.brokerName && (
                    <div className="text-xs text-gray-500 mt-1">Broker: {load.brokerName}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">Rate: ${load.rate || 0}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${load.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {load.status === 'Delivered' ? 'Completada' : 'Suspendida'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopDestinations({ destinations }) {
  const max = destinations.length > 0 ? destinations[0].count : 1;
  const visibleDestinations = destinations.slice(0, 3);
  const hiddenDestinations = destinations.slice(3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Destinations</h3>
      <div className="space-y-3">
        {destinations.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : (
          <>
            {visibleDestinations.map((d, i) => (
              <div key={`${d.city}-${i}`} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{i + 1}</span>
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="text-sm font-medium text-gray-800 break-words min-w-0">{d.city}</span>
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {hiddenDestinations.length > 0 && (
              <div className="max-h-36 overflow-y-auto pr-1 space-y-3">
                {hiddenDestinations.map((d, i) => (
                  <div key={`${d.city}-extra-${i}`} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{i + 4}</span>
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-sm font-medium text-gray-800 break-words min-w-0">{d.city}</span>
                        <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(d.count / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TopDrivers({ drivers }) {
  const max = drivers.length > 0 ? drivers[0].count : 1;
  const visibleDrivers = drivers.slice(0, 3);
  const hiddenDrivers = drivers.slice(3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Drivers</h3>
      <div className="space-y-3">
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : (
          <>
            {visibleDrivers.map((d, i) => (
              <div key={`${d.driver}-${i}`} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{i + 1}</span>
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="text-sm font-medium text-gray-800 break-words min-w-0">{d.driver}</span>
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {hiddenDrivers.length > 0 && (
              <div className="max-h-36 overflow-y-auto pr-1 space-y-3">
                {hiddenDrivers.map((d, i) => (
                  <div key={`${d.driver}-extra-${i}`} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{i + 4}</span>
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-sm font-medium text-gray-800 break-words min-w-0">{d.driver}</span>
                        <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(d.count / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TopBrokers({ brokers }) {
  const max = brokers.length > 0 ? brokers[0].count : 1;
  const visibleBrokers = brokers.slice(0, 3);
  const hiddenBrokers = brokers.slice(3);

  const brokerRow = (broker, index) => (
    <div key={`${broker.broker}-${index}`} className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{index + 1}</span>
      <BriefcaseBusiness className="h-4 w-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1 gap-2">
          <span className="text-sm font-medium text-gray-800 break-words min-w-0">{broker.broker}</span>
          <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{broker.count} {broker.count === 1 ? 'load' : 'loads'}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${(broker.count / max) * 100}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Brokers</h3>
      <div className="space-y-3">
        {brokers.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : (
          <>
            {visibleBrokers.map(brokerRow)}
            {hiddenBrokers.length > 0 && (
              <div className="max-h-36 overflow-y-auto pr-1 space-y-3">
                {hiddenBrokers.map((broker, index) => brokerRow(broker, index + 3))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UserRevenueRanking({ users }) {
  const maxRevenue = users.length > 0 ? users[0].revenue : 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">Ranking de Revenue Mensual</h3>
      <p className="text-xs text-gray-500 mb-4">Solo cargas completadas</p>
      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No revenue data yet</p>
        ) : (
          users.map((user, index) => (
            <div key={user.userId} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-5 text-right shrink-0">{index + 1}</span>
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="text-sm font-medium text-gray-800 break-words min-w-0">{user.userName}</span>
                  <span className="text-xs text-emerald-700 font-semibold shrink-0 whitespace-nowrap">${user.revenue.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${(user.revenue / maxRevenue) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{user.completedLoads} {user.completedLoads === 1 ? 'load completed' : 'loads completed'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Resume</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
      </div>
      <div className="h-80 rounded-xl bg-gray-200 animate-pulse" />
      <div className="h-80 rounded-xl bg-gray-200 animate-pulse" />
    </div>
  );
}