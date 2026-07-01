import { useEffect, useState } from 'react';
import { MapPin, User } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = 'https://load-tracker-api-lfau.onrender.com/api/resume';

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return `${day}/${m}`;
}

export default function ResumePage() {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        const res = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
        const d = await res.json();
        setData(d);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching resume:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [getToken]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Resume</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopDestinations destinations={data.topDestinations} />
        <TopDrivers drivers={data.topDrivers} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Revenue</h3>
        {data.dailyRevenue.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatDate} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={v => `$${v.toLocaleString()}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }} 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                labelFormatter={formatDate}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Loads</h3>
        {data.weeklyLoads.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No load data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.weeklyLoads}>
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
        )}
      </div>
    </div>
  );
}

function TopDestinations({ destinations }) {
  const max = destinations.length > 0 ? destinations[0].count : 1;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Destinations</h3>
      <div className="space-y-3">
        {destinations.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : destinations.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 w-5 text-right">{i + 1}</span>
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate">{d.city}</span>
                <span className="text-xs text-gray-500 ml-2">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopDrivers({ drivers }) {
  const max = drivers.length > 0 ? drivers[0].count : 1;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Drivers</h3>
      <div className="space-y-3">
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-500">No data yet</p>
        ) : drivers.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 w-5 text-right">{i + 1}</span>
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800 truncate">{d.driver}</span>
                <span className="text-xs text-gray-500 ml-2">{d.count} {d.count === 1 ? 'load' : 'loads'}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Resume</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
      </div>
      <div className="h-80 rounded-xl bg-gray-200 animate-pulse" />
      <div className="h-80 rounded-xl bg-gray-200 animate-pulse" />
    </div>
  );
}