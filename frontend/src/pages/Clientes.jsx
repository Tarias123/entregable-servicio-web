import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPlus, FaTrash, FaEdit, FaWhatsapp, FaInfoCircle, FaImages, FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import GaleriaModal from '../components/GaleriaModal';
import Swal from 'sweetalert2';
import api from '../services/api';
import ExportButtons from '../components/ExportButtons';

function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: null, nombre: '', telefono: '', email: '', whatsapp_apikey: '' });
    const [showGaleriaModal, setShowGaleriaModal] = useState(false);
    const [selectedClienteForGaleria, setSelectedClienteForGaleria] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const q = queryParams.get('q');
        if (q !== null) {
            setSearchTerm(q);
        }
    }, [location.search]);

    const fetchClientes = async (sd = '', ed = '') => {
        try {
            let url = '/clientes';
            if (sd && ed) url += `?startDate=${sd}&endDate=${ed}`;
            const response = await api.get(url);
            setClientes(response.data);
        } catch (error) {
            console.error('Error fetching clientes:', error);
        }
    };

    const handleFiltrar = () => fetchClientes(startDate, endDate);

    const handleLimpiarFiltro = () => {
        setStartDate('');
        setEndDate('');
        fetchClientes('', '');
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/clientes/${formData.id}`, formData);
                Swal.fire('Actualizado!', 'El cliente ha sido actualizado.', 'success');
            } else {
                await api.post('/clientes', formData);
                Swal.fire('Guardado!', 'El cliente ha sido registrado.', 'success');
            }
            setShowModal(false);
            setFormData({ id: null, nombre: '', telefono: '', email: '', whatsapp_apikey: '' });
            setIsEditing(false);
            fetchClientes();
        } catch (error) {
            console.error('Error saving cliente:', error);
            Swal.fire('Error', 'Hubo un error al guardar el cliente.', 'error');
        }
    };

    const handleEdit = (cliente) => {
        setFormData(cliente);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/clientes/${id}`);
                Swal.fire('Eliminado!', 'El cliente ha sido eliminado.', 'success');
                fetchClientes();
            } catch (error) {
                console.error("Error deleting cliente", error);
                Swal.fire('Error', 'No se pudo eliminar el cliente.', 'error');
            }
        }
    };

    const filteredClientes = clientes.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.telefono && c.telefono.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const exportColumns = [
        { label: 'ID', key: 'id' },
        { label: 'Nombre', key: 'nombre' },
        { label: 'Teléfono', key: 'telefono' },
        { label: 'Email', key: 'email' }
    ];

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 sm:space-y-0">
                <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
                <div className="flex items-center space-x-4">
                    <ExportButtons title="Directorio de Clientes" columns={exportColumns} data={filteredClientes} fileName="reporte_clientes" />
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ id: null, nombre: '', telefono: '', email: '', whatsapp_apikey: '' });
                            setShowModal(true);
                        }}
                        className="flex items-center space-x-2 px-6 py-2.5 rounded-full text-white font-semibold shadow-md transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                    >
                        <FaPlus /> <span>Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="border-b border-gray-100 pb-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <FaSearch className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] transition-all bg-gray-50/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium flex items-center gap-1"><FaFilter className="text-gray-400" /> Registro:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50"
                        />
                        <span className="text-gray-400 text-sm">—</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={e => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50"
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                                <th className="pb-4 font-semibold">ID</th>
                                <th className="pb-4 font-semibold">Nombre</th>
                                <th className="pb-4 font-semibold">Teléfono</th>
                                <th className="pb-4 font-semibold">Email</th>
                                <th className="pb-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClientes.length === 0 ? (
                                <tr><td colSpan="5" className="py-8 text-center text-gray-400">No hay clientes encontrados con ese término.</td></tr>
                            ) : (
                                filteredClientes.map((cliente) => (
                                    <tr key={cliente.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 text-gray-500">#{cliente.id}</td>
                                        <td className="py-4 font-medium text-gray-800">{cliente.nombre}</td>
                                        <td className="py-4 text-gray-600">{cliente.telefono || '-'}</td>
                                        <td className="py-4 text-gray-600">{cliente.email || '-'}</td>
                                        <td className="py-4 flex justify-end space-x-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedClienteForGaleria(cliente);
                                                    setShowGaleriaModal(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-[#a42ca1] transition-colors"
                                                title="Galería"
                                            >
                                                <FaImages />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(cliente)}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Editar"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cliente.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nuevo Cliente */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl scale-100 transition-transform">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">{isEditing ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text" required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800"
                                />
                            </div>
                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                <label className="flex items-center text-sm font-bold text-green-700 mb-2">
                                    <FaWhatsapp className="mr-2 text-green-600" size={18} /> API Key CallMeBot (WhatsApp)
                                </label>
                                <input
                                    type="text"
                                    value={formData.whatsapp_apikey || ''}
                                    onChange={e => setFormData({ ...formData, whatsapp_apikey: e.target.value })}
                                    className="w-full px-4 py-2 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white text-gray-800 mb-2"
                                    placeholder="Ej: 123456"
                                />
                                <div className="flex items-start text-xs text-green-600">
                                    <FaInfoCircle className="mt-0.5 mr-1 flex-shrink-0" />
                                    <span>Para recibir notificaciones automáticas, el cliente debe registrarse en el bot oficial de CallMeBot y pegar aquí su API Key.</span>
                                </div>
                            </div>
                            <div className="flex space-x-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setIsEditing(false);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 text-white rounded-xl font-medium shadow-md transition-transform hover:scale-105"
                                    style={{ background: 'linear-gradient(90deg, #811e86 0%, #30176b 100%)' }}
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Galería */}
            {showGaleriaModal && selectedClienteForGaleria && (
                <GaleriaModal 
                    cliente={selectedClienteForGaleria}
                    onClose={() => {
                        setShowGaleriaModal(false);
                        setSelectedClienteForGaleria(null);
                    }}
                />
            )}
        </div>
    );
}

export default Clientes;
