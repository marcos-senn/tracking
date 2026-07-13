import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, MapPin, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, useUser } from '@clerk/clerk-react';

const statusColors = {
  'Booked': 'bg-purple-100 text-purple-700',
  'En Route to PU': 'bg-orange-100 text-orange-700',
  'At Pickup': 'bg-yellow-100 text-yellow-700',
  'En Route to DEL': 'bg-blue-100 text-blue-700',
  'At Delivery': 'bg-cyan-100 text-cyan-700',
  'Delivered': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700'
};

const statuses = ['Booked', 'En Route to PU', 'At Pickup', 'En Route to DEL', 'At Delivery', 'Delivered', 'Cancelled'];

const API_LOADS = 'https://load-tracker-api-lfau.onrender.com/api/loads';
const API_DRIVERS = 'https://load-tracker-api-lfau.onrender.com/api/drivers';
const API_BROKERS = 'https://load-tracker-api-lfau.onrender.com/api/brokers';

function formatDateLocal(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

export default function LoadsPage() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loads, setLoads] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [initialDriverId, setInitialDriverId] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const [lRes, dRes, bRes] = await Promise.all([
        fetch(API_LOADS, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(API_DRIVERS, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(API_BROKERS, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const lData = await lRes.json();
      const dData = await dRes.json();
      const bData = await bRes.json();
      
      const loadsWithNames = lData.loads.map(load => {
        const driver = dData.drivers.find(d => d._id === load.driverId);
        return { ...load, driverName: driver ? driver.driver : 'Unassigned', truck: driver ? driver.truck : '—' };
      });

      const activeLoads = loadsWithNames.filter(l => l.status !== 'Delivered' && l.status !== 'Cancelled');

      setLoads(activeLoads);
      setDrivers(dData.drivers);
      setBrokers(bData.brokers || []);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar datos');
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const driverId = searchParams.get('driverId');
    const loadId = searchParams.get('loadId');

    if (driverId) {
      setInitialDriverId(driverId);
      setEditing(null);
      setDialogOpen(true);
      setSearchParams({});
    }

    if (loadId && loads.length > 0) {
      const matched = loads.find((l) => l._id === loadId);
      if (matched) {
        setEditing(matched);
        setDialogOpen(true);
        setSearchParams({});
      }
    }
  }, [loads, searchParams, setSearchParams]);

  const filtered = loads.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.loadNumber?.toLowerCase().includes(s) || l.driverName?.toLowerCase().includes(s) || l.brokerName?.toLowerCase().includes(s) || l.puCity?.toLowerCase().includes(s) || l.delCity?.toLowerCase().includes(s);
    }
    return true;
  });

  const handleDelete = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_LOADS}/${deleteId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLoads((prev) => prev.filter((l) => l._id !== deleteId));
      setDeleteId(null);
      toast.success('Load deleted');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const confirmStatusChange = async () => {
    if (!statusModal) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_LOADS}/${statusModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ data: { status: statusModal.status } })
      });
      const updatedLoad = await res.json();
      
      if (statusModal.status === 'Delivered' || statusModal.status === 'Cancelled') {
        setLoads(prev => prev.filter(l => l._id !== statusModal.id));
        toast.success(`Carga marcada como ${statusModal.status === 'Delivered' ? 'Completada' : 'Suspendida'}`);
      } else {
        const driver = drivers.find(d => d._id === updatedLoad.driverId);
        const updatedLoadWithName = { 
          ...updatedLoad, 
          driverName: driver ? driver.driver : 'Unassigned', 
          truck: driver ? driver.truck : '—' 
        };
        setLoads(prev => prev.map(l => l._id === statusModal.id ? updatedLoadWithName : l));
        toast.success(`Carga actualizada a ${statusModal.status}`);
      }
      
      setStatusModal(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar estado');
      setStatusModal(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-800">Loads</h1>
        <button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="h-4 w-4" /> Add Load
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            placeholder="Search loads, drivers, cities..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
        >
          <option value="all">All Status</option>
          {statuses.filter(s => s !== 'Delivered' && s !== 'Cancelled').map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">No active loads</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((load) => (
            <LoadCard 
              key={load._id} 
              load={load} 
              currentUserId={userId} 
              onEdit={() => { setEditing(load); setDialogOpen(true); }} 
              onDelete={() => setDeleteId(load._id)}
              onStatusChange={(status) => setStatusModal({ id: load._id, status })}
            />
          ))}
        </div>
      )}

      {dialogOpen && (
        <LoadDialog 
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
            setInitialDriverId('');
          }} 
          load={editing} 
          drivers={drivers} 
          brokers={brokers}
          onSaved={() => {
            fetchData();
            setInitialDriverId('');
          }} 
          getToken={getToken}
          user={user}
          initialDriverId={initialDriverId}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-gray-800">Delete Load</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this load?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setStatusModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-gray-800">Confirmar Acción</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Realmente deseas marcar esta carga como <strong>{statusModal.status === 'Delivered' ? 'Completada' : 'Suspendida'}</strong>? Se moverá al historial y ya no la verás en tu lista principal.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStatusModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={confirmStatusChange} className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${statusModal.status === 'Delivered' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadCard({ load, currentUserId, onEdit, onDelete, onStatusChange }) {
  const isOwner = load.userId === currentUserId;
  const creatorLabel = load.createdByName || (isOwner ? 'Tú' : 'Usuario');

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 group hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-lg text-indigo-600">{load.driverName || 'Unassigned'}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[load.status || ''] || 'bg-gray-100 text-gray-700'}`}>
                {load.status}
              </span>
            </div>
            <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full whitespace-nowrap max-w-[180px] truncate" title={`Creado por ${creatorLabel}`}>
              Creado por {creatorLabel}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-3">
            <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
            <span>{load.puCity || '—'}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
            <span>{load.delCity || '—'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-3">
            <span className="text-gray-500">Load #: <span className="text-gray-900 font-bold">{load.loadNumber || '—'}</span></span>
            <span className="text-gray-500">Broker: <span className="text-gray-900 font-bold">{load.brokerName || '—'}</span></span>
            <span className="text-gray-500">Truck: <span className="text-gray-900 font-bold">{load.truck || '—'}</span></span>
            <span className="text-gray-500">Rate: <span className="text-emerald-600 font-bold">${(load.rate || 0).toLocaleString()}</span></span>
            
            {load.puDate && (
              <span className="text-purple-600 font-bold">
                PU: <span className="text-purple-800 font-medium">{formatDateLocal(load.puDate)} {load.puTimeFrom || ''}</span>
              </span>
            )}
            {load.delDate && (
              <span className="text-red-600 font-bold">
                DEL: <span className="text-red-800 font-medium">{formatDateLocal(load.delDate)} {load.delTimeFrom || ''}</span>
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-wrap gap-2 transition-opacity shrink-0">
            <button onClick={onEdit} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors" title="Editar">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onStatusChange('Delivered')} className="p-2.5 border border-emerald-300 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors" title="Marcar Completada">
              <CheckCircle className="h-4 w-4" />
            </button>
            <button onClick={() => onStatusChange('Cancelled')} className="p-2.5 border border-red-300 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Marcar Suspendida">
              <XCircle className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="p-2.5 border border-gray-300 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadDialog({ onClose, load, drivers, brokers, onSaved, getToken, user, initialDriverId }) {
  const empty = {
    loadNumber: '', driverId: '', brokerName: '', status: 'Booked', rate: '',
    puCity: '', puDate: '', puTimeFrom: '', puTimeTo: '',
    delCity: '', delDate: '', delTimeFrom: '', delTimeTo: ''
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [statusConfirmModal, setStatusConfirmModal] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  useEffect(() => {
    if (load) {
      setForm({
        loadNumber: load.loadNumber || '',
        driverId: load.driverId || '',
        brokerName: load.brokerName || '',
        status: load.status || 'Booked',
        rate: load.rate?.toString() || '',
        puCity: load.puCity || '',
        puDate: load.puDate || '',
        puTimeFrom: load.puTimeFrom || '',
        puTimeTo: load.puTimeTo || '',
        delCity: load.delCity || '',
        delDate: load.delDate || '',
        delTimeFrom: load.delTimeFrom || '',
        delTimeTo: load.delTimeTo || ''
      });
    } else if (initialDriverId) {
      setForm({
        ...empty,
        driverId: initialDriverId
      });
    } else {
      setForm(empty);
    }
  }, [load, initialDriverId]);

  const handleStatusChange = (newStatus) => {
    if (load && form.status !== newStatus) {
      setStatusConfirmModal({ from: form.status, to: newStatus });
      setPendingStatus(newStatus);
    } else {
      setForm((f) => ({ ...f, status: newStatus }));
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      setForm((f) => ({ ...f, status: pendingStatus }));
    }
    setStatusConfirmModal(null);
    setPendingStatus(null);
  };

  const handleSave = async () => {
    if (!form.loadNumber.trim()) { toast.error('Load # es obligatorio'); return; }
    if (!form.driverId) { toast.error('Driver es obligatorio'); return; }
    if (!form.rate.trim()) { toast.error('Rate es obligatorio'); return; }
    if (!form.delCity.trim()) { toast.error('Destination (Delivery City) es obligatorio'); return; }

    setSaving(true);
    try {
      const token = await getToken();
      const method = load ? 'PUT' : 'POST';
      const url = load ? `${API_LOADS}/${load._id}` : API_LOADS;
      const createdByName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Unknown';
      const payload = {
        ...form,
        createdByName,
        createdByEmail: user?.primaryEmailAddress?.emailAddress || ''
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ data: payload })
      });

      if (!res.ok) throw new Error('Error al guardar');

      toast.success(load ? 'Load updated' : 'Load created');
      setSaving(false);
      onClose();
      onSaved();
    } catch (error) {
      toast.error('Failed to save');
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputClass = "mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow";
  const labelClass = "text-sm font-medium text-gray-700";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-6 text-gray-800">{load ? 'Edit Load' : 'Add Load'}</h2>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Load # *</label>
                <input required value={form.loadNumber} onChange={(e) => set('loadNumber', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={(e) => handleStatusChange(e.target.value)} className={inputClass}>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Driver *</label>
              <select required value={form.driverId || 'none'} onChange={(e) => set('driverId', e.target.value === 'none' ? '' : e.target.value)} className={inputClass}>
                <option value="none">— Select —</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.driver} (Truck {d.truck})</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Broker</label>
              <input
                value={form.brokerName}
                onChange={(e) => set('brokerName', e.target.value)}
                list="broker-suggestions"
                placeholder="Type or select a broker"
                className={inputClass}
              />
              <datalist id="broker-suggestions">
                {brokers.map((broker) => (
                  <option key={broker._id} value={broker.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>Rate ($) *</label>
              <input required type="number" value={form.rate} onChange={(e) => set('rate', e.target.value)} className={inputClass} />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-bold text-purple-600 mb-3">Pickup Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input 
                    type="text" 
                    value={form.puCity} 
                    onChange={(e) => set('puCity', e.target.value)} 
                    placeholder="Enter city or address"
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" value={form.puDate} onChange={(e) => set('puDate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time From</label>
                  <input type="time" value={form.puTimeFrom} onChange={(e) => set('puTimeFrom', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time To</label>
                  <input type="time" value={form.puTimeTo} onChange={(e) => set('puTimeTo', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-bold text-red-600 mb-3">Delivery Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City (Destination) *</label>
                  <input 
                    type="text" 
                    required
                    value={form.delCity} 
                    onChange={(e) => set('delCity', e.target.value)} 
                    placeholder="Enter city or address"
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" value={form.delDate} onChange={(e) => set('delDate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time From</label>
                  <input type="time" value={form.delTimeFrom} onChange={(e) => set('delTimeFrom', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Time To</label>
                  <input type="time" value={form.delTimeTo} onChange={(e) => set('delTimeTo', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {statusConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setStatusConfirmModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2 text-gray-800">Confirmar Cambio de Estado</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Cambiar estado de <strong>{statusConfirmModal.from}</strong> a <strong>{statusConfirmModal.to}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setStatusConfirmModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={confirmStatusChange} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}