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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopDestinations destinations={data.topDestinations} />
        <TopDrivers drivers={data.topDrivers} />
      </div>

      {/* Gráfico de Ingresos */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 w-full overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Revenue</h3>
        {data.dailyRevenue.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue data yet</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
        )}
      </div>

      {/* Gráfico de Cargas Semanales */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 w-full overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Loads</h3>
        {data.weeklyLoads.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No load data yet</p>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
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
          <p className="text-sm text-gray-500">No data yet