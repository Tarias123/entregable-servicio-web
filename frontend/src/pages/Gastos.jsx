import { useState, useEffect, useContext } from 'react';
import { FaFileInvoiceDollar, FaPlus, FaTrash, FaEdit, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ConfigContext } from '../context/ConfigContext';
import ExportButtons from '../components/ExportButtons';

function Gastos() {
    const [gastos, setGastos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useContext(AuthContext);
    const { config } = useContext(ConfigContext);

    // Estado del modal y del formulario
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        concepto: '',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        categoria: 'otros'
    });

    const fetchGastos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gastos');
            setGastos(response.data);
        } catch (error) {
            console.error('Error fetching gastos:', error);
            Swal.fire('Error', 'No se pudieron cargar los gastos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // En una app real podríamos restringir gastos sólo a Admin. De momento lo dejamos que estilistas lo vean o dependiendo el requerimiento.
        fetchGastos();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openModal = () => {
        setFormData({
            id: null,
            concepto: '',
            descripcion: '',
            monto: '',
            fecha: new Date().toISOString().split('T')[0],
            categoria: 'otros'
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleEdit = (gasto) => {
        const dateObj = new Date(gasto.fecha);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const formattedDate = (new Date(dateObj - tzOffset)).toISOString().split('T')[0];

        setFormData({
            id: gasto.id,
            concepto: gasto.concepto,
            descripcion: gasto.descripcion || '',
            monto: gasto.monto,
            fecha: formattedDate,
            categoria: gasto.categoria
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (formData.monto <= 0) {
                Swal.fire('Error', 'El monto debe ser numérico y mayor a 0', 'error');
                return;
            }

            const dataToSend = { ...formData, usuario_id: user?.id || 1 }; // Envía usuario_id del JWT o fallback de 1

            if (isEditing) {
                await api.put(`/gastos/${formData.id}`, dataToSend);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'El egreso ha sido actualizado.', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/gastos', dataToSend);
                Swal.fire({ icon: 'success', title: 'Registrado', text: 'Egreso guardado correctamente.', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            fetchGastos();
        } catch (error) {
            console.error('Error saving gasto:', error);
            Swal.fire('Error', 'No se pudo guardar la información.', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Cuidado, se eliminará permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/gastos/${id}`);
                Swal.fire('Eliminado!', 'El gasto ha sido borrado.', 'success');
                fetchGastos();
            } catch (error) {
                console.error("Error deleting gasto", error);
                Swal.fire('Error', 'No se pudo eliminar el gasto.', 'error');
            }
        }
    };

    const formatCurrency = (amount) => {
        return (config?.simbolo_moneda || '$') + parseFloat(amount).toLocaleString();
    };

    const getCategoryBadge = (cat) => {
        const mapper = {
            'servicios': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Servicios Básicos (Luz/Agua)' },
            'insumos': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Insumos de Salón' },
            'nomina': { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Nómina / Pagos' },
            'mantenimiento': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Mantenimiento de Equipo' },
            'otros': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Otros Gastos' },
        };
        const m = mapper[cat] || mapper['otros'];
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>{m.label}</span>;
    };

    const totalEgresos = gastos.reduce((acc, gasto) => acc + parseFloat(gasto.monto), 0);
    const filteredGastos = gastos.filter(g =>
        g.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportColumns = [
        { label: 'Fecha', key: 'fecha' },
        { label: 'Concepto', key: 'concepto' },
        { label: 'Categoría', key: 'categoria' },
        { label: 'Monto', key: 'monto' },
        { label: 'Responsable', key: 'usuario_nombre' }
    ];

    return (
        <div className="h-full flex flex-col space-y-6 animation-fade-in relative z-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-0 space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FaFileInvoiceDollar className="text-[#a42ca1] mr-3" /> Egresos y Gastos
                    </h1>
                    <p className="text-gray-500 mt-1">Registra los gastos y salidas de dinero del negocio.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <ExportButtons title="Registro de Gastos" columns={exportColumns} data={filteredGastos} fileName="reporte_gastos" />
                    <button
                        onClick={openModal}
                        className="bg-gradient-to-r from-[#a42ca1] to-[#651b75] hover:opacity-90 text-white px-6 py-2.5 rounded-xl flex items-center transition-all shadow-md font-medium"
                    >
                        <FaPlus className="mr-2" /> Nuevo Gasto
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total de Egresos</h3>
                    <p className="text-3xl font-bold text-red-500">{formatCurrency(totalEgresos)}</p>
                </div>
                <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center text-red-400">
                    <FaFileInvoiceDollar size={28} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="relative w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <FaSearch className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar concepto o categoría..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredGastos.length > 0 ? (
                                    filteredGastos.map((gasto) => (
                                        <tr key={gasto.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                {new Date(gasto.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                                                {gasto.concepto}
                                                <div className="text-xs text-gray-400 truncate max-w-xs">{gasto.descripcion}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {getCategoryBadge(gasto.categoria)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                                -{formatCurrency(gasto.monto)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {gasto.usuario_nombre || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(gasto)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors" title="Editar">
                                                    <FaEdit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(gasto.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                                                    <FaTrash size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron registros de gastos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal para Crear / Editar Gasto */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm animation-fade-in">
                    <div className="relative w-full max-w-md p-4 mx-auto">
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-[#a42ca1]" />
                                    {isEditing ? 'Editar Egreso' : 'Registrar Egreso'}
                                </h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                                        <input
                                            type="text" name="concepto" required value={formData.concepto} onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1] transition-all"
                                            placeholder="Ej. Pago de luz eléctrica"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ({config?.simbolo_moneda || '$'}) *</label>
                                            <input
                                                type="number" name="monto" required min="1" step="0.01" value={formData.monto} onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                            <input
                                                type="date" name="fecha" required value={formData.fecha} onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                                        <select
                                            name="categoria" required value={formData.categoria} onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 bg-white focus:border-[#a42ca1] transition-all"
                                        >
                                            <option value="servicios">Servicios Básicos (Luz/Agua)</option>
                                            <option value="insumos">Insumos de Salón</option>
                                            <option value="nomina">Nómina / Pagos a Personal</option>
                                            <option value="mantenimiento">Mantenimiento de Equipo</option>
                                            <option value="otros">Otros Gastos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Detalles o Factura Ref. (opcional)</label>
                                        <textarea
                                            name="descripcion" value={formData.descripcion} onChange={handleChange}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1] transition-all resize-none h-20"
                                            placeholder="Anotaciones extra..."
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button" onClick={() => setShowModal(false)}
                                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none transition-all font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-gradient-to-r from-[#a42ca1] to-[#651b75] hover:opacity-90 text-white rounded-xl shadow-md transition-all font-medium"
                                    >
                                        {isEditing ? 'Actualizar' : 'Guardar Gasto'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Gastos;
