import { useState, useEffect, useContext, useRef } from 'react';
import { FaPlus, FaTrash, FaEdit, FaCut, FaImage } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { ConfigContext } from '../context/ConfigContext';

const EMPTY_FORM = { id: null, nombre: '', descripcion: '', precio: '', duracion_minutos: '', imagen_url_actual: '' };

function Servicios() {
    const { config } = useContext(ConfigContext);
    const [servicios, setServicios] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [imagenFile, setImagenFile] = useState(null);
    const [imagenPreview, setImagenPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
    const fileInputRef = useRef(null);

    const fetchServicios = async () => {
        try {
            const response = await api.get('/servicios');
            setServicios(response.data);
        } catch (error) {
            console.error('Error fetching servicios:', error);
        }
    };

    useEffect(() => { fetchServicios(); }, []);

    const openCreate = () => {
        setIsEditing(false);
        setFormData(EMPTY_FORM);
        setImagenFile(null);
        setImagenPreview(null);
        setShowModal(true);
    };

    const handleEdit = (servicio) => {
        setIsEditing(true);
        setFormData({
            id: servicio.id,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion || '',
            precio: servicio.precio,
            duracion_minutos: servicio.duracion_minutos,
            imagen_url_actual: servicio.imagen_url || ''
        });
        setImagenFile(null);
        setImagenPreview(servicio.imagen_url || null);
        setShowModal(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImagenFile(file);
        setImagenPreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImagenFile(null);
        setImagenPreview(null);
        setFormData(f => ({ ...f, imagen_url_actual: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (parseFloat(formData.precio) <= 0 || parseInt(formData.duracion_minutos) <= 0) {
            return Swal.fire({ icon: 'error', title: 'Error', text: 'El precio y duración deben ser mayores a 0', confirmButtonColor: '#a42ca1' });
        }
        setUploading(true);
        try {
            const data = new FormData();
            data.append('nombre', formData.nombre);
            data.append('descripcion', formData.descripcion);
            data.append('precio', formData.precio);
            data.append('duracion_minutos', formData.duracion_minutos);
            data.append('imagen_url_actual', formData.imagen_url_actual || '');
            if (imagenFile) data.append('imagen', imagenFile);

            if (isEditing) {
                await api.put(`/servicios/${formData.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                Swal.fire({ icon: 'success', title: '¡Actualizado!', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/servicios', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                Swal.fire({ icon: 'success', title: '¡Servicio registrado!', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            fetchServicios();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el servicio.', confirmButtonColor: '#a42ca1' });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Se eliminará el servicio.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar'
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/servicios/${id}`);
                Swal.fire('Eliminado', 'El servicio ha sido borrado.', 'success');
                fetchServicios();
            } catch {
                Swal.fire('Error', 'No se pudo eliminar el servicio.', 'error');
            }
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 sm:space-y-0">
                <h2 className="text-2xl font-bold text-gray-800">Catálogo de Servicios</h2>
                <button
                    onClick={openCreate}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-full text-white font-semibold shadow-md transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                >
                    <FaPlus /> <span>Nuevo Servicio</span>
                </button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6">
                {servicios.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-gray-400 bg-white rounded-3xl shadow-sm border border-gray-100">
                        No hay servicios registrados en el catálogo.
                    </div>
                ) : (
                    servicios.map((servicio) => (
                        <div key={servicio.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden">
                            {/* Imagen referencial */}
                            {servicio.imagen_url ? (
                                <div
                                    className="w-full h-52 overflow-hidden cursor-zoom-in relative group"
                                    onClick={() => setLightboxImg(servicio.imagen_url)}
                                >
                                    <img
                                        src={servicio.imagen_url}
                                        alt={servicio.nombre}
                                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {/* Gradiente inferior para que el texto no choque */}
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                                    {/* Badge "Ver" al hacer hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <span className="text-white text-xs font-semibold bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full shadow">
                                            🔍 Ver imagen
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)' }}>
                                    <FaCut size={30} className="text-purple-300" />
                                    <span className="text-xs text-purple-300 font-medium">Sin imagen</span>
                                </div>
                            )}

                            {/* Contenido */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-gray-800 truncate flex-1 pr-2">{servicio.nombre}</h3>
                                    <div className="flex space-x-1 flex-shrink-0">
                                        <button onClick={() => handleEdit(servicio)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50" title="Editar"><FaEdit size={14} /></button>
                                        <button onClick={() => handleDelete(servicio.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50" title="Eliminar"><FaTrash size={14} /></button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-2">{servicio.descripcion || 'Sin descripción'}</p>
                                <div className="flex items-end justify-between mt-auto">
                                    <div className="text-2xl font-black text-[#7d1b82]">
                                        {config?.simbolo_moneda || 'S/'} {parseFloat(servicio.precio).toLocaleString()}
                                    </div>
                                    <div className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                                        ⏱ {servicio.duracion_minutos} min
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-zoom-out"
                    onClick={() => setLightboxImg(null)}
                >
                    <img
                        src={lightboxImg}
                        alt="Imagen referencial"
                        className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setLightboxImg(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-xl transition-colors"
                    >
                        &times;
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 pb-0">
                            <h3 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                                <FaCut className="text-[#a42ca1]" />
                                {isEditing ? 'Editar Servicio' : 'Registrar Servicio'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Servicio</label>
                                <input
                                    type="text" required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50"
                                    placeholder="Ej: Ondulación permanente"
                                />
                            </div>

                            {/* Precio y Duración */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio ({config?.simbolo_moneda || 'S/'})</label>
                                    <input
                                        type="number" required min="1" step="0.01"
                                        value={formData.precio}
                                        onChange={e => setFormData({ ...formData, precio: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                                    <input
                                        type="number" required min="5" step="5"
                                        value={formData.duracion_minutos}
                                        onChange={e => setFormData({ ...formData, duracion_minutos: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 resize-none h-20"
                                    placeholder="Detalles del servicio..."
                                />
                            </div>

                            {/* Imagen referencial */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <FaImage className="text-purple-400" size={13} /> Imagen referencial
                                    <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                                </label>

                                {imagenPreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagenPreview}
                                            alt="Preview"
                                            className="w-full h-44 object-cover rounded-2xl border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow"
                                        >
                                            &times;
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-2 right-2 text-xs bg-white/90 hover:bg-white px-3 py-1.5 rounded-full font-medium text-gray-700 shadow transition-colors"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors bg-gray-50 hover:bg-purple-50"
                                    >
                                        <FaImage size={24} />
                                        <span className="text-sm font-medium">Haz clic para subir una imagen</span>
                                        <span className="text-xs">JPG, PNG o WebP</span>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>

                            {/* Botones */}
                            <div className="flex space-x-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setIsEditing(false); }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 px-4 py-2 text-white rounded-xl font-medium shadow-md transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                                    style={{ background: 'linear-gradient(90deg, #811e86 0%, #30176b 100%)' }}
                                >
                                    {uploading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Servicios;
