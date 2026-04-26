import { useState, useEffect, useContext } from 'react';
import { FaClipboardList, FaPlus, FaSearch, FaArrowUp, FaArrowDown, FaFilter } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const TIPO_LABELS = {
    entrada:  { label: 'Entrada',  cls: 'bg-green-100 text-green-700' },
    salida:   { label: 'Salida',   cls: 'bg-red-100 text-red-600' },
};

const REF_LABELS = {
    compra:   'Compra',
    venta:    'Venta',
    manual:   'Manual',
    traslado: 'Traslado',
};

function Kardex() {
    const { user } = useContext(AuthContext);

    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);

    // Filtros
    const [filtros, setFiltros] = useState({
        producto_id: '',
        almacen_id: '',
        tipo: '',
        startDate: '',
        endDate: '',
        search: '',
    });

    // Modal movimiento manual
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        tipo: 'entrada',
        producto_id: '',
        almacen_id: '',
        cantidad: '',
        costo: '',
        notas: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMetadata();
        fetchMovimientos();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [prodRes, almRes] = await Promise.all([
                api.get('/inventario'),
                api.get('/almacenes'),
            ]);
            setProductos(prodRes.data);
            setAlmacenes(almRes.data);
        } catch { /* silencioso */ }
    };

    const fetchMovimientos = async (overrideFiltros) => {
        const f = overrideFiltros || filtros;
        const params = {};
        if (f.producto_id) params.producto_id = f.producto_id;
        if (f.almacen_id)  params.almacen_id  = f.almacen_id;
        if (f.tipo)        params.tipo        = f.tipo;
        if (f.startDate && f.endDate) { params.startDate = f.startDate; params.endDate = f.endDate; }

        try {
            setLoading(true);
            const res = await api.get('/kardex', { params });
            setMovimientos(res.data);
        } catch {
            Swal.fire('Error', 'No se pudieron cargar los movimientos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFiltroChange = (key, value) => {
        const nuevos = { ...filtros, [key]: value };
        setFiltros(nuevos);
    };

    const handleBuscar = () => fetchMovimientos();

    const handleLimpiar = () => {
        const limpios = { producto_id: '', almacen_id: '', tipo: '', startDate: '', endDate: '', search: '' };
        setFiltros(limpios);
        fetchMovimientos(limpios);
    };

    const openModal = () => {
        setFormData({ tipo: 'entrada', producto_id: '', almacen_id: '', cantidad: '', costo: '', notas: '' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.producto_id || !formData.almacen_id || !formData.cantidad) {
            return Swal.fire('Atención', 'Completa los campos requeridos.', 'warning');
        }
        setSaving(true);
        try {
            await api.post('/kardex', { ...formData, usuario_id: user?.id || null });
            Swal.fire({ icon: 'success', title: 'Movimiento registrado', timer: 1800, showConfirmButton: false });
            setIsModalOpen(false);
            fetchMovimientos();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo registrar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Filtro local por búsqueda de texto
    const displayed = movimientos.filter(m => {
        if (!filtros.search) return true;
        const term = filtros.search.toLowerCase();
        return m.producto_nombre?.toLowerCase().includes(term) ||
               m.almacen_nombre?.toLowerCase().includes(term) ||
               m.usuario_nombre?.toLowerCase().includes(term) ||
               m.notas?.toLowerCase().includes(term);
    });

    // Totales
    const totalEntradas = displayed.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseInt(m.cantidad), 0);
    const totalSalidas  = displayed.filter(m => m.tipo === 'salida').reduce((s, m) => s + parseInt(m.cantidad), 0);

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaClipboardList className="text-purple-600" /> Kardex
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Registro de movimientos de inventario</p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow"
                >
                    <FaPlus /> Movimiento Manual
                </button>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <FaClipboardList className="text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{displayed.length}</p>
                        <p className="text-xs text-gray-500">movimientos</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <FaArrowDown className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-700">{totalEntradas}</p>
                        <p className="text-xs text-gray-500">uds. ingresadas</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <FaArrowUp className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600">{totalSalidas}</p>
                        <p className="text-xs text-gray-500">uds. salidas</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <FaFilter className="text-purple-400" size={13} />
                    <span className="text-sm font-semibold text-gray-700">Filtros</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="relative col-span-2 sm:col-span-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filtros.search}
                            onChange={e => handleFiltroChange('search', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                    </div>
                    <select
                        value={filtros.producto_id}
                        onChange={e => handleFiltroChange('producto_id', e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">Todos los productos</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <select
                        value={filtros.almacen_id}
                        onChange={e => handleFiltroChange('almacen_id', e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">Todos los almacenes</option>
                        {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <select
                        value={filtros.tipo}
                        onChange={e => handleFiltroChange('tipo', e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                        <option value="">Entrada y salida</option>
                        <option value="entrada">Solo entradas</option>
                        <option value="salida">Solo salidas</option>
                    </select>
                    <div className="flex gap-2">
                        <button onClick={handleBuscar} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors">Buscar</button>
                        <button onClick={handleLimpiar} className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 text-sm transition-colors">✕</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Desde</label>
                        <input type="date" value={filtros.startDate} onChange={e => handleFiltroChange('startDate', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                        <input type="date" value={filtros.endDate} onChange={e => handleFiltroChange('endDate', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Cargando movimientos...</div>
                ) : displayed.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <FaClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
                        <p>No hay movimientos para los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-purple-50 text-purple-700 text-left">
                                    <th className="px-4 py-3 font-semibold">Fecha</th>
                                    <th className="px-4 py-3 font-semibold">Tipo</th>
                                    <th className="px-4 py-3 font-semibold">Producto</th>
                                    <th className="px-4 py-3 font-semibold">Almacén</th>
                                    <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                                    <th className="px-4 py-3 font-semibold text-right">Costo unit.</th>
                                    <th className="px-4 py-3 font-semibold">Referencia</th>
                                    <th className="px-4 py-3 font-semibold">Usuario</th>
                                    <th className="px-4 py-3 font-semibold">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map((m, i) => {
                                    const tipo = TIPO_LABELS[m.tipo] || { label: m.tipo, cls: 'bg-gray-100 text-gray-600' };
                                    return (
                                        <tr key={m.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                {new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <span className="block text-xs text-gray-400">
                                                    {new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${tipo.cls}`}>
                                                    {m.tipo === 'entrada' ? <FaArrowDown size={10} /> : <FaArrowUp size={10} />}
                                                    {tipo.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{m.producto_nombre}</td>
                                            <td className="px-4 py-3 text-gray-600">{m.almacen_nombre}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">
                                                {parseFloat(m.costo) > 0 ? `S/ ${parseFloat(m.costo).toFixed(2)}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                    {REF_LABELS[m.referencia_tipo] || m.referencia_tipo}
                                                    {m.referencia_id ? ` #${m.referencia_id}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{m.usuario_nombre || <span className="text-gray-300">—</span>}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{m.notas || <span className="text-gray-300">—</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Movimiento Manual */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaClipboardList className="text-purple-600" /> Movimiento Manual
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de movimiento</label>
                                <div className="flex gap-3">
                                    {['entrada', 'salida'].map(t => (
                                        <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${formData.tipo === t ? (t === 'entrada' ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600') : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            <input type="radio" name="tipo" value={t} checked={formData.tipo === t} onChange={e => setFormData(f => ({ ...f, tipo: e.target.value }))} className="hidden" />
                                            {t === 'entrada' ? <FaArrowDown size={13} /> : <FaArrowUp size={13} />}
                                            <span className="font-semibold capitalize">{t}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Producto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Producto <span className="text-red-500">*</span></label>
                                <select value={formData.producto_id} onChange={e => setFormData(f => ({ ...f, producto_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" required>
                                    <option value="">— Selecciona un producto —</option>
                                    {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>

                            {/* Almacén */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Almacén <span className="text-red-500">*</span></label>
                                <select value={formData.almacen_id} onChange={e => setFormData(f => ({ ...f, almacen_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" required>
                                    <option value="">— Selecciona un almacén —</option>
                                    {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </div>

                            {/* Cantidad y Costo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
                                    <input type="number" min="1" value={formData.cantidad} onChange={e => setFormData(f => ({ ...f, cantidad: e.target.value }))}
                                        placeholder="1" className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo unit. <span className="text-gray-400 text-xs">(opcional)</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S/</span>
                                        <input type="number" min="0" step="0.01" value={formData.costo} onChange={e => setFormData(f => ({ ...f, costo: e.target.value }))}
                                            placeholder="0.00" className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas <span className="text-gray-400 text-xs">(opcional)</span></label>
                                <textarea value={formData.notas} onChange={e => setFormData(f => ({ ...f, notas: e.target.value }))}
                                    placeholder="Ej: Ajuste de inventario, producto dañado..."
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-sm" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold disabled:opacity-60">
                                    {saving ? 'Guardando...' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Kardex;
