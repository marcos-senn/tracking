import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/clerk-react';

const API_URL = 'https://load-tracker-api-lfau.onrender.com/api/brokers';

export default function BrokersPage() {
  const { getToken } = useAuth();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchBrokers = async () => {
    try {
      const token = await getToken();
      const res = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setBrokers(data.brokers || []);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar brokers');
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrokers(); }, []);

  const filtered = brokers.filter((broker) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [broker.name, broker.phone, broker.email, broker.notes, broker.setUp ? 'setup' : 'no setup']
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const handleSave = async (formData) => {
    try {
      const token = await getToken();
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `${API_URL}/${editing._id}` : API_URL;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ data: formData })
      });
      const saved = await res.json();
      if (editing) {
        setBrokers(prev => prev.map(b => b._id === editing._id ? saved : b));
        toast.success('Broker actualizado');
      } else {
        setBrokers(prev => [...prev, saved]);
        toast.success('Broker creado');
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error('Error al guardar broker');
    }
  };

  const handleDelete = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBrokers(prev => prev.filter(b => b._id !== deleteId));
      setDeleteId(null);
      toast.success('Broker eliminado');
    } catch (error) {
      toast.error('Error al eliminar broker');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Cargando brokers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-800">Brokers</h1>
        <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Broker
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          placeholder="Search brokers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-500 shadow-sm">No brokers found</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((broker) => (
            <div key={broker._id} className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-indigo-600">{broker.name}</h3>
                  {broker.setUp && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Set up</span>}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                  {broker.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{broker.phone}</span>
                    </div>
                  )}
                  {broker.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span>{broker.email}</span>
                    </div>
                  )}
                </div>
                {broker.notes && <p className="text-sm text-gray-500 mt-2">{broker.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(broker); setDialogOpen(true); }} className="flex items-center justify-center h-8 w-8 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteId(broker._id)} className="flex items-center justify-center h-8 w-8 border border-gray-300 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && <BrokerDialog onClose={() => { setDialogOpen(false); setEditing(null); }} broker={editing} onSave={handleSave} />}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-gray-800">Delete Broker</h2>
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

function BrokerDialog({ onClose, broker, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', setUp: false, notes: '' });

  useEffect(() => {
    if (broker) {
      setForm({ name: broker.name || '', phone: broker.phone || '', email: broker.email || '', setUp: Boolean(broker.setUp), notes: broker.notes || '' });
    } else {
      setForm({ name: '', phone: '', email: '', setUp: false, notes: '' });
    }
  }, [broker]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = 'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
  const labelClass = 'text-sm font-medium text-gray-700';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-6 text-gray-800">{broker ? 'Edit Broker' : 'Add Broker'}</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="broker-setup" type="checkbox" checked={form.setUp} onChange={(e) => set('setUp', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="broker-setup" className="text-sm text-gray-700">We have set up with this broker</label>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows="3" className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}
