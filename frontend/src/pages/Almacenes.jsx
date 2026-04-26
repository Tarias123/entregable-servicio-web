import { useState, useEffect } from 'react';
import { FaWarehouse, FaBoxOpen, FaCubes } from 'react-icons/fa';
import api from '../services/api';

const ALMACEN_COLORS = {
    1: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-700' },
    2: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
    3: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-400', badge: 'bg-red-100 text-red-600' },
};

function Almacenes() {
    const [almacenes, setAlmacenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null); // almacén seleccionado para ver detalle
    const [stockDetalle, setStockDetalle] = useState([]);
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => { fetchAlmacenes(); }, []);

    const fetchAlmacenes = async () => {
        try {
            setLoading(true);
            const res = await api.get('/almacenes');
            setAlmacenes(res.data);
        } catch {
            // silencioso
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAlmacen = async (almacen) => {
        setSelected(almacen);
        setLoadingStock(true);
        try {
            const res = await api.get(`/almacenes/${almacen.id}/stock`);
            setStockDetalle(res.data);
        } catch {
            setStockDetalle([]);
        } finally {
            setLoadingStock(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-400">Cargando almacenes...</div>;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaWarehouse className="text-purple-600" /> Almacenes
                </h1>
                <p className="text-sm text-gray-500 mt-1">Gestión de almacenes y stock por ubicación</p>
            </div>

            {/* Cards de almacenes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {almacenes.map(a => {
                    const colors = ALMACEN_COLORS[a.id] || ALMACEN_COLORS[1];
                    const isActive = selected?.id === a.id;
                    return (
                        <button
                            key={a.id}
                            onClick={() => handleSelectAlmacen(a)}
                            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${colors.bg} ${isActive ? colors.border : 'border-transparent'}`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.badge}`}>
                                    <FaWarehouse size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">{a.nombre}</p>
                                    <p className="text-xs text-gray-500">{a.descripcion}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-2">
                                <div>
                                    <p className="text-2xl font-bold text-gray-800">{a.total_productos}</p>
                                    <p className="text-xs text-gray-500">productos</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-800">{a.total_unidades}</p>
                                    <p className="text-xs text-gray-500">unidades</p>
                                </div>
                            </div>
                            {isActive && (
                                <div className={`mt-3 text-xs font-semibold px-2 py-1 rounded-lg inline-block ${colors.badge}`}>
                                    Viendo detalle
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Detalle de stock */}
            {selected && (
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FaBoxOpen className="text-purple-500" />
                            Stock — {selected.nombre}
                        </h2>
                        <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">Cerrar</button>
                    </div>
                    {loadingStock ? (
                        <div className="p-8 text-center text-gray-400">Cargando stock...</div>
                    ) : stockDetalle.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <FaCubes size={32} className="mx-auto mb-2 text-gray-300" />
                            <p>Este almacén no tiene productos con stock.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-left">
                                        <th className="px-4 py-3 font-semibold">Producto</th>
                                        <th className="px-4 py-3 font-semibold text-right">Precio venta</th>
                                        <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockDetalle.map((s, i) => (
                                        <tr key={s.producto_id} className={`border-t border-gray-100 hover:bg-gray-50 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {s.imagen_url ? (
                                                        <img src={s.imagen_url} alt={s.producto_nombre} className="w-8 h-8 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                                            <FaBoxOpen size={12} className="text-purple-400" />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-gray-800">{s.producto_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">
                                                S/ {parseFloat(s.precio).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-1 rounded-lg font-semibold text-sm ${s.cantidad <= 0 ? 'bg-red-100 text-red-600' : s.cantidad <= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {s.cantidad}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Almacenes;
