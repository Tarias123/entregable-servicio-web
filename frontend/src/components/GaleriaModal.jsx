import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaUpload, FaTrash, FaSpinner, FaImage } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';

function GaleriaModal({ cliente, onClose }) {
    const [fotos, setFotos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [lightboxImg, setLightboxImg] = useState(null);

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const fetchFotos = async () => {
        try {
            setIsLoading(true);
            const response = await api.get(`/galeria/cliente/${cliente.id}`);
            setFotos(response.data);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            Swal.fire('Error', 'No se pudieron cargar las fotos de la galería.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (cliente && cliente.id) {
            fetchFotos();
        }
    }, [cliente]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('Error', 'El archivo no debe pesar más de 5MB.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('foto', file);
        formData.append('cliente_id', cliente.id);
        formData.append('tipo', 'general');
        formData.append('descripcion', '');

        try {
            setIsUploading(true);
            await api.post('/galeria/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            Swal.fire({
                title: 'Foto subida',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            fetchFotos();
        } catch (error) {
            console.error('Error uploading photo:', error);
            Swal.fire('Error', error.response?.data?.error || 'No se pudo subir la foto.', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (fotoId) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará la foto permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/galeria/${fotoId}`);
                Swal.fire({
                    title: 'Eliminada',
                    text: 'La foto ha sido eliminada de la galería.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchFotos();
            } catch (error) {
                console.error("Error deleting photo:", error);
                Swal.fire('Error', 'No se pudo eliminar la foto.', 'error');
            }
        }
    };

    return (
        <>
        {/* Lightbox */}
        {lightboxImg && (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
                onClick={() => setLightboxImg(null)}
            >
                <button
                    onClick={() => setLightboxImg(null)}
                    className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <img
                    src={lightboxImg}
                    alt="Vista ampliada"
                    className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                            <FaImage className="mr-3 text-[#a42ca1]" />
                            Galería de Trabajos
                        </h3>
                        <p className="text-gray-500 mt-1">Cliente: <span className="font-semibold text-gray-700">{cliente.nombre}</span></p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20">
                    
                    {/* Controls */}
                    <div className="flex justify-end mb-6">
                        <input 
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-white font-semibold shadow-md transition-all ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
                            style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                        >
                            {isUploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                            <span>{isUploading ? 'Subiendo...' : 'Subir Foto'}</span>
                        </button>
                    </div>

                    {/* Gallery Grid */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <FaSpinner className="animate-spin text-4xl text-[#a42ca1]" />
                        </div>
                    ) : fotos.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <FaImage className="mx-auto text-5xl text-gray-300 mb-4" />
                            <h4 className="text-lg font-semibold text-gray-600">No hay fotos en la galería</h4>
                            <p className="text-gray-400 mt-2">Sube la primera foto del trabajo realizado para este cliente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {fotos.map((foto) => (
                                <div
                                    key={foto.id}
                                    className="group relative rounded-2xl overflow-hidden shadow-sm border border-gray-200 aspect-square bg-gray-100 flex items-center justify-center cursor-zoom-in"
                                    onClick={() => setLightboxImg(foto.url_foto?.startsWith('http') ? foto.url_foto : `${backendUrl}${foto.url_foto}`)}
                                >
                                    <img
                                        src={foto.url_foto?.startsWith('http') ? foto.url_foto : `${backendUrl}${foto.url_foto}`}
                                        alt={foto.descripcion || 'Trabajo en cliente'}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=No+Available'; }}
                                    />

                                    {/* Overlay visual - siempre pointer-events-none */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                                        {foto.fecha_subida && (
                                            <span className="text-white text-xs font-medium mb-1 drop-shadow-md">
                                                {new Date(foto.fecha_subida).toLocaleDateString()}
                                            </span>
                                        )}
                                        {foto.servicio_nombre && (
                                            <span className="text-white/80 text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm inline-block self-start mb-2">
                                                {foto.servicio_nombre}
                                            </span>
                                        )}
                                        <div className="flex justify-end pointer-events-auto">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(foto.id); }}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                                                title="Eliminar foto"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

export default GaleriaModal;
