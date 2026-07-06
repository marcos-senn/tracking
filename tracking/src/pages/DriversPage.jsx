import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/clerk-react';

const statusColors = {
  'Available': 'bg-emerald-100 text-emerald-700',
  'En Route': 'bg-blue-100 text-blue-700',
  'Off Duty': 'bg-gray-100 text-gray-600',
};

const API_URL = 'https://load-tracker-api-lfau.onrender.com/api/drivers';

export default function DriversPage() {
  const { getToken } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchDrivers = async () => {
    try {
      const token = await getToken();
      const res = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setDrivers(data.drivers);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar conductores');
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const filtered = drivers.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !d.driver?.toLowerCase().includes(search.toLowerCase()) && !d.company?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/${deleteId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDrivers(prev => prev.filter(d => d._id !== deleteId));
      setDeleteId(null);
      toast.success('Driver deleted');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSave = async (formData) => {
    try {
      const token = await getToken();
      if (editing) {
        const res = await fetch(`${API_URL}/${editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ data: formData })
        });
        const updated = await res.json();
        setDrivers(prev => prev.map(d => d._id === editing._id ? updated : d));
        toast.success('Driver updated');
      } else {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ data: formData })
        });
        const saved = await res.json();
        setDrivers(prev => [...prev, saved]);
        toast.success('Driver created');
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Cargando conductores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-800">Drivers</h1>
        <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Driver
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            placeholder="Search drivers..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow">
          <option value="all">All Status</option>
          <option value="Available">Available</option>
          <option value="En Route">En Route</option>
          <option value="Off Duty">Off Duty</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-500 shadow-sm">No drivers found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <div key={driver._id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 group hover:shadow-md hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-indigo-600">{driver.driver}</h3>
                  <p className="text-sm text-gray-500">{driver.company}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[driver.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                  {driver.status}
                </span>
              </div>
              <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-gray-500">
                  <span>Truck:</span> <span className="text-gray-900 font-bold">{driver.truck || '—'}</span>
                </div>
                {driver.trailer && (
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Trailer:</span> <span className="text-gray-900 font-bold">{driver.trailer}</span>
                  </div>
                )}
                {driver.vin && (
                  <div className="flex items-center justify-between text-gray-500">
                    <span>VIN#:</span> <span className="text-gray-900 font-bold">{driver.vin}</span>
                  </div>
                )}
                {driver.cell && (
                  <div className="flex items-center gap-1.5 text-gray-500 pt-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <a href={`tel:${driver.cell}`} className="hover:underline text-blue-600 font-medium">{driver.cell}</a>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setEditing(driver); setDialogOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteId(driver._id)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <DriverDialog 
          onClose={() => { setDialogOpen(false); setEditing(null); }} 
          driver={editing} 
          onSave={handleSave} 
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-gray-800">Delete Driver</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DriverDialog({ onClose, driver, onSave }) {
  const [form, setForm] = useState({ 
    driver: '', company: 'P&G Translog', truck: '', trailer: '', cell: '', vin: '', status: 'Available' 
  });

  useEffect(() => {
    if (driver) {
      setForm({
        driver: driver.driver || '',
        company: driver.company || 'P&G Translog',
        truck: driver.truck?.toString() || '',
        trailer: driver.trailer || '',
        cell: driver.cell || '',
        vin: driver.vin || '',
        status: driver.status || 'Available',
      });
    } else {
      setForm({ driver: '', company: 'P&G Translog', truck: '', trailer: '', cell: '', vin: '', status: 'Available' });
    }
  }, [driver]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputClass = "mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow";
  const labelClass = "text-sm font-medium text-gray-700";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-6 text-gray-800">{driver ? 'Edit Driver' : 'Add Driver'}</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Driver Name</label>
            <input value={form.driver} onChange={e => set('driver', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Company</label>
            <input value={form.company} onChange={e => set('company', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Truck #</label>
              <input value={form.truck} onChange={e => set('truck', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Trailer #</label>
              <input value={form.trailer} onChange={e => set('trailer', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cell #</label>
            <input value={form.cell} onChange={e => set('cell', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>VIN #</label>
            <input value={form.vin} onChange={e => set('vin', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
              <option value="Available">Available</option>
              <option value="En Route">En Route</option>
              <option value="Off Duty">Off Duty</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}