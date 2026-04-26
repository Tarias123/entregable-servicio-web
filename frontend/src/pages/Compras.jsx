import { useState, useEffect, useContext } from 'react';
import { FaPlus, FaSearch, FaShoppingCart, FaWarehouse, FaCheckCircle, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ALMACENES_DESTINO = [
    { id: 1, nombre: 'Almacén Principal', desc: 'Productos para venta' },
    { id: 2, nombre: 'Almacén Consumos', desc: 'Productos para servicios' },
];

function Compras() {
    const { user } = useContext(AuthContext);

    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);

    // Filtros de lista
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');

    // Modal nueva compra
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        proveedor_id: '',
        producto_id: '',
        cantidad: '',
        costo: '',
        fecha: new Date().toISOString().split('T')[0],
    });
    const [saving, setSaving] = useState(false);
    const [productosFiltrados, setProductosFiltrados] = useState([]);

    // Modal almacenar
    const [almacenarModal, setAlmacenarModal] = useState({ open: false, compra: null, almacen_id: 1 });
    const [almacenando, setAlmacenando] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [cRes, pRes, prodRes] = await Promise.all([
                api.get('/compras'),
                api.get('/proveedores'),
                api.get('/inventario'),
            ]);
            setCompras(cRes.data);
            setProveedores(pRes.data);
            setProductos(prodRes.data);
            setProductosFiltrados(prodRes.data);
        } catch {
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Cuando cambia el proveedor seleccionado en el form, no filtramos productos (los proveedores
    // no están vinculados a productos en el DB), pero lo dejamos como info extra de la compra.
    const handleProveedorChange = (e) => {
        setFormData(f => ({ ...f, proveedor_id: e.target.value }));
        // Podrías filtrar productos si tuvieras esa relación; por ahora muestra todos
        setProductosFiltrados(productos);
    };

    const openModal = () => {
        setFormData({
            proveedor_id: '',
            producto_id: '',
            cantidad: '',
            costo: '',
            fecha: new Date().toISOString().split('T')[0],
        });
        setProductosFiltrados(productos);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.producto_id || !formData.cantidad || !formData.costo || !formData.fecha) {
            return Swal.fire('Atención', 'Completa todos los campos obligatorios.', 'warning');
        }
        setSaving(true);
        try {
            await api.post('/compras', {
                ...formData,
                usuario_id: user?.id || null,
                proveedor_id: formData.proveedor_id || null,
            });
            Swal.fire({ icon: 'success', title: 'Compra registrada', text: 'Ahora puedes almacenarla en un almacén.', timer: 2000, showConfirmButton: false });
            setIsModalOpen(false);
            fetchAll();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo registrar la compra.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openAlmacenar = (compra) => {
        setAlmacenarModal({ open: true, compra, almacen_id: 1 });
    };

    const handleAlmacenar = async () => {
        const { compra, almacen_id } = almacenarModal;
        setAlmacenando(true);
        try {
            await api.patch(`/compras/${compra.id}/almacenar`, {
                almacen_destino_id: almacen_id,
                usuario_id: user?.id || null,
            });
            const almacenNombre = ALMACENES_DESTINO.find(a => a.id === parseInt(almacen_id))?.nombre;
            Swal.fire({ icon: 'success', title: '¡Almacenado!', text: `Productos ingresados al ${almacenNombre}.`, timer: 2000, showConfirmButton: false });
            setAlmacenarModal({ open: false, compra: null, almacen_id: 1 });
            fetchAll();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo almacenar.', 'error');
        } finally {
            setAlmacenando(false);
        }
    };

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar compra?',
            text: 'Solo se pueden eliminar compras pendientes.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Eliminar'
        });
        if (!confirm.isConfirmed) return;
        try {
            await api.delete(`/compras/${id}`);
            fetchAll();
        } catch (err) {
            Swal.fire('Error', err.response?.data?.error || 'No se pudo eliminar.', 'error');
        }
    };

    // Filtrar lista
    const filtered = compras.filter(c => {
        const matchSearch = !searchTerm ||
            c.producto_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEstado = !filtroEstado || c.estado === filtroEstado;
        return matchSearch && matchEstado;
    });

    const pendientes = compras.filter(c => c.estado === 'pendiente').length;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaShoppingCart className="text-purple-600" /> Compras
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {compras.length} compra{compras.length !== 1 ? 's' : ''} registrada{compras.length !== 1 ? 's' : ''}
                        {pendientes > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>}
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow"
                >
                    <FaPlus /> Nueva Compra
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o proveedor..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    />
                </div>
                <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="almacenado">Almacenado</option>
                </select>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Cargando compras...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <FaShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
                        <p>{searchTerm || filtroEstado ? 'No hay resultados para tu búsqueda.' : 'Aún no hay compras registradas.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-purple-50 text-purple-700 text-left">
                                    <th className="px-4 py-3 font-semibold">Producto</th>
                                    <th className="px-4 py-3 font-semibold">Proveedor</th>
                                    <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                                    <th className="px-4 py-3 font-semibold text-right">Costo unit.</th>
                                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                                    <th className="px-4 py-3 font-semibold">Fecha</th>
                                    <th className="px-4 py-3 font-semibold">Almacén</th>
                                    <th className="px-4 py-3 font-semibold">Estado</th>
                                    <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, i) => (
                                    <tr key={c.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-gray-800">{c.producto_nombre}</td>
                                        <td className="px-4 py-3 text-gray-600">{c.proveedor_nombre || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 font-semibold">{c.cantidad}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">S/ {parseFloat(c.costo).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                            S/ {(parseFloat(c.costo) * parseInt(c.cantidad)).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{c.fecha ? c.fecha.split('T')[0] : '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{c.almacen_nombre || <span className="text-gray-300">—</span>}</td>
                                        <td className="px-4 py-3">
                                            {c.estado === 'almacenado' ? (
                                                <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                                                    <FaCheckCircle /> Almacenado
                                                </span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-semibold">Pendiente</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                {c.estado === 'pendiente' && (
                                                    <>
                                                        <button
                                                            onClick={() => openAlmacenar(c)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                                                            title="Almacenar"
                                                        >
                                                            <FaWarehouse size={11} /> Almacenar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Nueva Compra */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaShoppingCart className="text-purple-600" /> Registrar Compra
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Proveedor (opcional, actúa como filtro informativo) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor <span className="text-gray-400 text-xs">(opcional)</span></label>
                                <select
                                    value={formData.proveedor_id}
                                    onChange={handleProveedorChange}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="">— Sin proveedor —</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Producto */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Producto <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.producto_id}
                                    onChange={e => setFormData(f => ({ ...f, producto_id: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    required
                                >
                                    <option value="">— Selecciona un producto —</option>
                                    {productosFiltrados.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cantidad y Costo */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.cantidad}
                                        onChange={e => setFormData(f => ({ ...f, cantidad: e.target.value }))}
                                        placeholder="10"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">S/</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.costo}
                                            onChange={e => setFormData(f => ({ ...f, costo: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Total calculado */}
                            {formData.cantidad && formData.costo && (
                                <div className="bg-purple-50 rounded-xl px-4 py-3 flex justify-between items-center">
                                    <span className="text-sm text-purple-700 font-medium">Total compra:</span>
                                    <span className="text-lg font-bold text-purple-800">
                                        S/ {(parseFloat(formData.costo || 0) * parseInt(formData.cantidad || 0)).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.fecha}
                                    onChange={e => setFormData(f => ({ ...f, fecha: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60">
                                    {saving ? 'Guardando...' : 'Registrar Compra'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Almacenar */}
            {almacenarModal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaWarehouse className="text-purple-600" /> Almacenar Compra
                            </h2>
                            <button onClick={() => setAlmacenarModal({ open: false, compra: null, almacen_id: 1 })} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            <div className="bg-gray-50 rounded-xl p-4 mb-5">
                                <p className="text-sm text-gray-500">Producto</p>
                                <p className="font-bold text-gray-800">{almacenarModal.compra?.producto_nombre}</p>
                                <p className="text-sm text-gray-600 mt-1">{almacenarModal.compra?.cantidad} unidades × S/ {parseFloat(almacenarModal.compra?.costo || 0).toFixed(2)}</p>
                            </div>

                            <p className="text-sm font-medium text-gray-700 mb-3">¿A qué almacén quieres ingresar estos productos?</p>
                            <div className="space-y-3">
                                {ALMACENES_DESTINO.map(a => (
                                    <label
                                        key={a.id}
                                        className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${almacenarModal.almacen_id === a.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="almacen"
                                            value={a.id}
                                            checked={almacenarModal.almacen_id === a.id}
                                            onChange={() => setAlmacenarModal(m => ({ ...m, almacen_id: a.id }))}
                                            className="accent-purple-600"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-800">{a.nombre}</p>
                                            <p className="text-xs text-gray-500">{a.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setAlmacenarModal({ open: false, compra: null, almacen_id: 1 })}
                                    className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAlmacenar}
                                    disabled={almacenando}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    <FaWarehouse />
                                    {almacenando ? 'Almacenando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Compras;
