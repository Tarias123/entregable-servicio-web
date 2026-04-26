import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTruck, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';

const EMPTY_FORM = { nombre: '', ruc: '', telefono: '', email: '', direccion: '' };

function Proveedores() {
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchProveedores(); }, []);

    const fetchProveedores = async () => {
        try {
            setLoading(true);
            const res = await api.get('/proveedores');
            setProveedores(res.data);
        } catch {
            Swal.fire('Error', 'No se pudieron cargar los proveedores.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (p) => {
        setIsEditing(true);
        setEditId(p.id);
        setFormData({ nombre: p.nombre, ruc: p.ruc || '', telefono: p.telefono || '', email: p.email || '', direccion: p.direccion || '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, nombre) => {
        const confirm = await Swal.fire({
            title: `¿Eliminar a ${nombre}?`,
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Sí, eliminar'
        });
        if (!confirm.isConfirmed) return;
        try {
            await api.delete(`/proveedores/${id}`);
            Swal.fire('Eliminado', 'Proveedor eliminado.', 'success');
            fetchProveedores();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo eliminar.', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return Swal.fire('Atención', 'El nombre es obligatorio.', 'warning');
        setSaving(true);
        try {
            if (isEditing) {
                await api.put(`/proveedores/${editId}`, formData);
                Swal.fire('Actualizado', 'Proveedor actualizado correctamente.', 'success');
            } else {
                await api.post('/proveedores', formData);
                Swal.fire('Creado', 'Proveedor registrado correctamente.', 'success');
            }
            setIsModalOpen(false);
            fetchProveedores();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo guardar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filtered = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ruc && p.ruc.includes(searchTerm)) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaTruck className="text-purple-600" /> Proveedores
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow"
                >
                    <FaPlus /> Nuevo Proveedor
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, RUC o email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Cargando proveedores...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <FaTruck size={40} className="mx-auto mb-3 text-gray-300" />
                        <p>{searchTerm ? 'No se encontraron resultados.' : 'Aún no hay proveedores registrados.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-purple-50 text-purple-700 text-left">
                                    <th className="px-4 py-3 font-semibold">Nombre</th>
                                    <th className="px-4 py-3 font-semibold">RUC</th>
                                    <th className="px-4 py-3 font-semibold">Teléfono</th>
                                    <th className="px-4 py-3 font-semibold">Email</th>
                                    <th className="px-4 py-3 font-semibold">Dirección</th>
                                    <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p, i) => (
                                    <tr key={p.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.ruc || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.telefono || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3 text-gray-600">{p.email || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{p.direccion || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Editar">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => handleDelete(p.id, p.nombre)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Eliminar">
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">
                                {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Distribuidora Belleza S.A."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                                    <input
                                        type="text"
                                        value={formData.ruc}
                                        onChange={e => setFormData({ ...formData, ruc: e.target.value })}
                                        placeholder="20123456789"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.telefono}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                        placeholder="999 123 456"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="proveedor@ejemplo.com"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <textarea
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    placeholder="Av. Lima 123, San Isidro"
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60">
                                    {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Proveedores;
