import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaSearch, FaFileInvoiceDollar, FaFilter, FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { ConfigContext } from '../context/ConfigContext';
import { useContext } from 'react';
import ExportButtons from '../components/ExportButtons';

function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { config } = useContext(ConfigContext);

    useEffect(() => {
        fetchVentas();
    }, []);

    const fetchVentas = async (sd = '', ed = '') => {
        try {
            setLoading(true);
            let url = '/ventas';
            if (sd && ed) url += `?startDate=${sd}&endDate=${ed}`;
            const response = await api.get(url);
            setVentas(response.data);
        } catch (error) {
            console.error('Error fetching ventas:', error);
            Swal.fire('Error', 'No se pudo cargar el historial de ventas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFiltrar = () => fetchVentas(startDate, endDate);

    const handleLimpiarFiltro = () => {
        setStartDate('');
        setEndDate('');
        fetchVentas('', '');
    };

    const formatCurrency = (amount) => {
        return (config?.simbolo_moneda || '$') + parseFloat(amount).toLocaleString();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const getPaymentBadge = (method) => {
        switch (method) {
            case 'efectivo': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Efectivo</span>;
            case 'tarjeta': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Tarjeta</span>;
            case 'transferencia': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Transferencia</span>;
            default: return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{method}</span>;
        }
    };

    const totalIngresos = ventas.reduce((acc, venta) => acc + parseFloat(venta.total), 0);

    const filteredVentas = ventas.filter(venta =>
        (venta.cliente_nombre && venta.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venta.servicio_nombre && venta.servicio_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const exportColumns = [
        { label: 'ID Venta', key: 'id' },
        { label: 'Fecha/Hora', key: 'fecha' },
        { label: 'Cliente', key: 'cliente_nombre' },
        { label: 'Servicio', key: 'servicio_nombre' },
        { label: 'Total', key: 'total' },
        { label: 'Método Pago', key: 'metodo_pago' }
    ];

    return (
        <div className="h-full flex flex-col animation-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FaFileInvoiceDollar className="text-[#a42ca1] mr-3" /> Historial de Ventas
                    </h1>
                    <p className="text-gray-500 mt-1">Registro financiero de los servicios completados.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <ExportButtons title="Historial de Ventas" columns={exportColumns} data={filteredVentas} fileName="reporte_ventas" />
                </div>
            </div>

            {/* Resumen Financiero Top */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Ingresos Históricos</h3>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(totalIngresos)}</p>
                </div>
                <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <FaMoneyBillWave size={28} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between bg-gray-50/50">
                    <div className="relative w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <FaSearch className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar cliente o servicio..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1"><FaFilter className="text-gray-400" /> Fecha:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-white"
                        />
                        <span className="text-gray-400 text-sm">—</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-white"
                        />
                        <button
                            onClick={handleFiltrar}
                            disabled={!startDate || !endDate || endDate < startDate}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                        >
                            Filtrar
                        </button>
                        {(startDate || endDate) && (
                            <button
                                onClick={handleLimpiarFiltro}
                                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-colors"
                            >
                                <FaTimes size={12} /> Limpiar
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#a42ca1]"></div>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Venta</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicio</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Método Pago</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredVentas.length > 0 ? (
                                    filteredVentas.map((venta) => (
                                        <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{venta.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                                {formatDate(venta.fecha)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {venta.cliente_nombre || <span className="text-gray-400 italic">Desconocido</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {venta.servicio_nombre || <span className="text-gray-400 italic">Venta Libre</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                                {formatCurrency(venta.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getPaymentBadge(venta.metodo_pago)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="text-gray-300 mb-2">
                                                    <FaMoneyBillWave size={48} />
                                                </div>
                                                <p className="text-lg font-medium text-gray-600">No hay ventas registradas</p>
                                                <p className="text-sm">Completa una cita para ver los ingresos reflejados aquí.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Ventas;
