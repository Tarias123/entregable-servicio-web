import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTrash, FaEdit, FaBoxOpen, FaSearch, FaExclamationTriangle, FaImage } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { ConfigContext } from '../context/ConfigContext';
import { useContext } from 'react';
import ExportButtons from '../components/ExportButtons';

function Inventario() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { config } = useContext(ConfigContext);

    // Estado del modal de formulario
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        nombre: '',
        descripcion: '',
        precio: '',
        stock: '',
        imagen_url_actual: ''
    });
    const [imagenFile, setImagenFile] = useState(null);
    const [imagenPreview, setImagenPreview] = useState(null);
    const [uploadingImg, setUploadingImg] = useState(false);
    const fileInputRef = useRef(null);
    const [lightboxImg, setLightboxImg] = useState(null);

    useEffect(() => {
        fetchProductos();
    }, []);

    const fetchProductos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventario');
            setProductos(response.data);
        } catch (error) {
            console.error('Error fetching productos:', error);
            Swal.fire('Error', 'No se pudieron cargar los productos del inventario.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const openModal = () => {
        setIsEditing(false);
        setFormData({ id: null, nombre: '', descripcion: '', precio: '', stock: '', imagen_url_actual: '' });
        setImagenFile(null);
        setImagenPreview(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setImagenFile(null);
        setImagenPreview(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formatosPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!formatosPermitidos.includes(file.type)) {
            Swal.fire({
                icon: 'warning',
                title: 'Formato no compatible',
                text: `El archivo "${file.name}" no es compatible. Solo se permiten imágenes JPG, PNG o WEBP.`,
                confirmButtonColor: '#a42ca1'
            });
            e.target.value = '';
            return;
        }

        setImagenFile(file);
        setImagenPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setUploadingImg(true);
            const fd = new FormData();
            fd.append('nombre', formData.nombre);
            fd.append('descripcion', formData.descripcion);
            fd.append('precio', parseFloat(formData.precio));
            fd.append('stock', parseInt(formData.stock, 10));
            fd.append('imagen_url_actual', formData.imagen_url_actual || '');
            if (imagenFile) fd.append('imagen', imagenFile);

            if (isEditing) {
                await api.put(`/inventario/${formData.id}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('¡Actualizado!', 'Producto actualizado correctamente.', 'success');
            } else {
                await api.post('/inventario', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('¡Creado!', 'Producto creado correctamente.', 'success');
            }
            fetchProductos();
            closeModal();
        } catch (error) {
            console.error('Error guardando producto:', error);
            Swal.fire('Error', 'Ocurrió un error al guardar el producto.', 'error');
        } finally {
            setUploadingImg(false);
        }
    };

    const handleEdit = (producto) => {
        setIsEditing(true);
        setFormData({
            id: producto.id,
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            precio: producto.precio,
            stock: producto.stock,
            imagen_url_actual: producto.imagen_url || ''
        });
        setImagenFile(null);
        setImagenPreview(producto.imagen_url || null);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: "Se eliminará permanentemente este producto del inventario.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/inventario/${id}`);
                    Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
                    fetchProductos();
                } catch (error) {
                    console.error('Error eliminando producto:', error);
                    Swal.fire('Error', 'No se pudo eliminar el producto.', 'error');
                }
            }
        });
    };

    const getStockBadge = (stock) => {
        if (stock <= 0) {
            return <span className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"><FaExclamationTriangle className="mr-1" /> Agotado</span>;
        } else if (stock <= 5) {
            return <span className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold"><FaExclamationTriangle className="mr-1" /> Bajo (Quedan {stock})</span>;
        } else {
            return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{stock} unidades</span>;
        }
    };

    const formatCurrency = (amount) => {
        return (config?.simbolo_moneda || '$') + parseFloat(amount).toLocaleString();
    };

    const filteredProductos = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportColumns = [
        { label: 'ID', key: 'id' },
        { label: 'Producto', key: 'nombre' },
        { label: 'Precio', key: 'precio' },
        { label: 'Stock', key: 'stock' },
        { label: 'Descripción', key: 'descripcion' }
    ];

    return (
        <div className="h-full flex flex-col animation-fade-in relative z-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FaBoxOpen className="text-[#a42ca1] mr-3" /> Control de Inventario
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona productos, precios y visualiza alertas de stock bajo.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <ExportButtons title="Inventario de Productos" columns={exportColumns} data={filteredProductos} fileName="reporte_inventario" />
                    <button
                        onClick={openModal}
                        className="bg-gradient-to-r from-[#a42ca1] to-[#651b75] hover:opacity-90 text-white px-6 py-2.5 rounded-xl flex items-center transition-all shadow-md font-medium"
                    >
                        <FaPlus className="mr-2" /> Añadir Producto
                    </button>
                </div>
            </div>

            {/* Listado principal */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="relative w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <FaSearch className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
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
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Disponible</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Descripción</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredProductos.length > 0 ? (
                                    filteredProductos.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                        {prod.imagen_url
                                                            ? <img
                                                                src={prod.imagen_url}
                                                                alt={prod.nombre}
                                                                className="h-10 w-10 object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                                                                onClick={() => setLightboxImg(prod.imagen_url)}
                                                              />
                                                            : <FaBoxOpen size={18} />
                                                        }
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{prod.nombre}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                                {formatCurrency(prod.precio)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStockBadge(prod.stock)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell max-w-xs truncate">
                                                {prod.descripcion || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(prod)} className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors" title="Editar">
                                                    <FaEdit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(prod.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                                                    <FaTrash size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron productos en el inventario.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxImg && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm animation-fade-in">
                    <div className="relative w-full max-w-md p-4 mx-auto">
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {isEditing ? 'Editar Producto' : 'Añadir Producto'}
                                </h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Producto *</label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                                            <input
                                                type="number"
                                                name="precio"
                                                step="0.01"
                                                min="0"
                                                value={formData.precio}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual *</label>
                                            <input
                                                type="number"
                                                name="stock"
                                                min="0"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                        <textarea
                                            name="descripcion"
                                            rows="3"
                                            value={formData.descripcion}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/50 focus:border-[#a42ca1] resize-none"
                                        ></textarea>
                                    </div>

                                    {/* Imagen */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Producto</label>
                                        <div
                                            onClick={() => fileInputRef.current.click()}
                                            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#a42ca1] transition-colors"
                                        >
                                            {imagenPreview ? (
                                                <img src={imagenPreview} alt="preview" className="h-32 object-contain rounded-lg" />
                                            ) : (
                                                <>
                                                    <FaImage size={28} className="text-gray-300 mb-2" />
                                                    <span className="text-sm text-gray-400">Click para subir imagen</span>
                                                    <span className="text-xs text-gray-300 mt-1">Solo JPG, PNG o WEBP</span>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange}
                                        />
                                        {imagenPreview && (
                                            <button
                                                type="button"
                                                onClick={() => { setImagenFile(null); setImagenPreview(null); setFormData(prev => ({ ...prev, imagen_url_actual: '' })); }}
                                                className="mt-1 text-xs text-red-400 hover:text-red-600"
                                            >
                                                Quitar imagen
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a42ca1] transition-all font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploadingImg}
                                        className="px-5 py-2.5 bg-gradient-to-r from-[#a42ca1] to-[#651b75] hover:opacity-90 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#a42ca1] shadow-md transition-all font-medium disabled:opacity-60"
                                    >
                                        {uploadingImg ? 'Subiendo...' : isEditing ? 'Actualizar' : 'Guardar'}
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

export default Inventario;
