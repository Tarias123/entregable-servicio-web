import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { FaSave, FaImage, FaSpinner, FaBuilding, FaWhatsapp, FaDatabase, FaExclamationTriangle } from 'react-icons/fa';
import { ConfigContext } from '../context/ConfigContext';

function Configuracion() {
    const { refreshConfig } = useContext(ConfigContext);
    const [activeTab, setActiveTab] = useState('empresa');

    const [config, setConfig] = useState({
        nombre_empresa: '',
        simbolo_moneda: '$',
        telefono: '',
        direccion: '',
        logo_url: ''
    });
    
    const [whatsappConfig, setWhatsappConfig] = useState({
        notificar_nueva_cita: true,
        notificar_cancelacion: true,
        plantilla_nueva_cita: '',
        plantilla_cancelacion: ''
    });

    const [logoFile, setLogoFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingWhatsapp, setSavingWhatsapp] = useState(false);

    // Backup States
    const [restoreFile, setRestoreFile] = useState(null);
    const [restoring, setRestoring] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        // Ejecutar paralelamente para mayor rapidez
        Promise.all([fetchConfiguracion(), fetchWhatsappConfig()]).then(() => setLoading(false));
    }, []);

    const fetchConfiguracion = async () => {
        try {
            const response = await api.get('/configuracion');
            setConfig(response.data);
            if (response.data.logo_url) {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const serverUrl = baseUrl.replace('/api', '');
                setPreviewUrl(`${serverUrl}${response.data.logo_url}`);
            }
        } catch (error) {
            console.error("Error al obtener configuración empresa:", error);
        }
    };

    const fetchWhatsappConfig = async () => {
        try {
            const response = await api.get('/notificaciones/config');
            setWhatsappConfig(response.data);
        } catch (error) {
            console.error("Error al obtener configuración notificaciones:", error);
        }
    };

    const handleInputChange = (e) => {
        setConfig({
            ...config,
            [e.target.name]: e.target.value
        });
    };

    const handleWhatsappChange = (e) => {
        const { name, value, type, checked } = e.target;
        setWhatsappConfig({
            ...whatsappConfig,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('nombre_empresa', config.nombre_empresa);
            formData.append('simbolo_moneda', config.simbolo_moneda);
            formData.append('telefono', config.telefono || '');
            formData.append('direccion', config.direccion || '');
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            await api.put('/configuracion', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: 'Datos guardados',
                text: 'Los datos de la empresa se han actualizado correctamente.',
                confirmButtonColor: '#ff2a7a',
            });
            fetchConfiguracion();
            refreshConfig(); // Refresca el estado global para actualizar la moneda en todo el dashboard de inmediato
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la configuración de empresa', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleWhatsappSubmit = async (e) => {
        e.preventDefault();
        setSavingWhatsapp(true);
        try {
            await api.put('/notificaciones/config', whatsappConfig);
            Swal.fire({
                icon: 'success',
                title: 'Plantillas guardadas',
                text: 'La configuración de WhatsApp se ha actualizado.',
                confirmButtonColor: '#25D366',
            });
            fetchWhatsappConfig();
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la configuración de WhatsApp', 'error');
        } finally {
            setSavingWhatsapp(false);
        }
    };

    const handleDownloadBackup = () => {
        api.get('/database/backup', { responseType: 'blob' })
            .then(response => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `respaldo_sistema_salon_${new Date().toISOString().split('T')[0]}.sql`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(() => Swal.fire('Error', 'No se pudo generar el respaldo', 'error'));
    };

    const handleRestoreBackup = async () => {
        if (!restoreFile) return;

        const result = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: "Esta acción reemplazará toda tu base de datos actual con la del archivo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f97316',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, sobreescribir datos!'
        });

        if (result.isConfirmed) {
            setRestoring(true);
            const formData = new FormData();
            formData.append('backupFile', restoreFile);
            
            try {
                await api.post('/database/restore', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('¡Éxito!', 'Sistema restaurado. Se recargará la página.', 'success').then(() => {
                    window.location.reload();
                });
            } catch (err) {
                Swal.fire('Error', 'El archivo no es válido o hubo un fallo de inyección en servidor.', 'error');
            } finally {
                setRestoring(false);
            }
        }
    };

    const handleFactoryReset = async () => {
        const result = await Swal.fire({
            title: '¡ALERTA CRÍTICA!',
            text: "Estás a punto de borrar todos los registros operativos (citas, clientes, ventas). ¡NO HAY VUELTA ATRÁS!",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, PURGAR SISTEMA',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const secondResult = await Swal.fire({
                title: 'Última Confirmación',
                text: "Escribe 'CONFIRMAR' para proceder irreversiblemente",
                input: 'text',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                inputValidator: (value) => {
                    if (value !== 'CONFIRMAR') {
                        return 'Debes escribir CONFIRMAR en mayúsculas';
                    }
                }
            });

            if (secondResult.isConfirmed && secondResult.value === 'CONFIRMAR') {
                setResetting(true);
                try {
                    await api.post('/database/reset');
                    Swal.fire('¡Sistema Purgado!', 'La base de datos se ha restablecido a fábrica operativamente.', 'success').then(() => {
                        window.location.href = '/dashboard';
                    });
                } catch (error) {
                    Swal.fire('Error', 'Hubo un fatal error al intentar purgar el sistema.', 'error');
                } finally {
                    setResetting(false);
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <FaSpinner className="animate-spin text-4xl text-pink-500" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#a42ca1] to-[#3a1b75] mb-2">
                Ajustes del Sistema
            </h1>
            <p className="text-gray-500 mb-8">Administra la identidad global y notificaciones de los clientes.</p>

            {/* Pestañas de Interfaz */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('empresa')}
                    className={`flex items-center pb-4 px-6 text-sm font-bold transition-all ${activeTab === 'empresa' ? 'border-b-2 border-[#a42ca1] text-[#a42ca1]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <FaBuilding className="mr-2" /> Datos de Empresa
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`flex items-center pb-4 px-6 text-sm font-bold transition-all ${activeTab === 'whatsapp' ? 'border-b-2 border-[#25D366] text-[#25D366]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <FaWhatsapp className="mr-2 text-lg" /> Mensajería y Plantillas
                </button>
                <button
                    onClick={() => setActiveTab('sistema')}
                    className={`flex items-center pb-4 px-6 text-sm font-bold transition-all ${activeTab === 'sistema' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <FaDatabase className="mr-2 text-lg" /> Respaldo y Reset
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                {activeTab === 'empresa' && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
                        {/* Logo Section */}
                        <div className="flex flex-col sm:flex-row gap-8 items-center border-b border-gray-100 pb-8">
                            <div className="w-32 h-32 rounded-full border-4 border-gray-50 overflow-hidden bg-gray-100 flex items-center justify-center relative group">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <FaImage className="text-gray-300 text-4xl" />
                                )}
                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all cursor-pointer">
                                    <label htmlFor="logo-upload" className="cursor-pointer text-white text-xs font-bold px-2 py-1 bg-[#a42ca1] rounded-lg">
                                        Cambiar
                                    </label>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 mb-1">Logotipo de la Empresa</h3>
                                <p className="text-xs text-gray-500 mb-4">Esta imagen aparecerá en la barra lateral. (Formatos recomendados: PNG o JPG).</p>
                                <input
                                    type="file"
                                    id="logo-upload"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="logo-upload" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 px-4 rounded-lg cursor-pointer transition">
                                    Seleccionar Archivo
                                </label>
                            </div>
                        </div>

                        {/* Data Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de la Empresa</label>
                                <input
                                    type="text" name="nombre_empresa" required
                                    value={config.nombre_empresa} onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] bg-gray-50/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Símbolo de Moneda</label>
                                <input
                                    type="text" name="simbolo_moneda" required
                                    value={config.simbolo_moneda} onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] bg-gray-50/50"
                                    placeholder="Ej. S/"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Teléfono de Contacto</label>
                                <input
                                    type="tel" name="telefono"
                                    value={config.telefono} onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] bg-gray-50/50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Dirección Principal</label>
                                <textarea
                                    name="direccion" rows="2"
                                    value={config.direccion} onChange={handleInputChange}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] bg-gray-50/50"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-gray-100">
                            <button
                                type="submit" disabled={saving}
                                className="bg-gradient-to-r from-[#811e86] to-[#3a1b75] hover:opacity-90 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg flex items-center disabled:opacity-50"
                            >
                                {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                                {saving ? 'Guardando...' : 'Guardar Datos'}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'whatsapp' && (
                    <form onSubmit={handleWhatsappSubmit} className="space-y-6 animate-fadeIn">
                        <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl p-4 mb-6 relative overflow-hidden">
                            <div className="absolute right-0 top-0 text-[#25D366] opacity-10 text-9xl -mt-4 -mr-4 pointer-events-none"><FaWhatsapp /></div>
                            <h3 className="font-bold text-[#1da850] mb-2 text-lg relative z-10">Automatización de Mensajes</h3>
                            <p className="text-sm text-gray-600 relative z-10">
                                Las variables dinámicas disponibles son: <strong className="font-mono bg-white px-1 rounded">[CLIENTE]</strong>, <strong className="font-mono bg-white px-1 rounded">[SERVICIO]</strong>, y <strong className="font-mono bg-white px-1 rounded">[FECHA]</strong>.
                                Estas palabras serán reemplazadas automáticamente antes de enviar el SMS al WhatsApp del cliente registrado.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {/* Plantilla Nueva Cita */}
                            <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-800 text-lg">Nueva Cita Programada</h4>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            name="notificar_nueva_cita"
                                            checked={!!whatsappConfig.notificar_nueva_cita} 
                                            onChange={handleWhatsappChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                                        <span className="ml-3 text-sm font-semibold text-gray-600">
                                            {whatsappConfig.notificar_nueva_cita ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </label>
                                </div>
                                <textarea
                                    name="plantilla_nueva_cita"
                                    value={whatsappConfig.plantilla_nueva_cita}
                                    onChange={handleWhatsappChange}
                                    rows="3"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white transition-opacity disabled:opacity-50"
                                    disabled={!whatsappConfig.notificar_nueva_cita}
                                    placeholder="Hola [CLIENTE], tu cita de [SERVICIO] para el [FECHA] ha sido confirmada..."
                                />
                            </div>

                            {/* Plantilla Cancelación */}
                            <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-800 text-lg">Cancelación de Cita</h4>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            name="notificar_cancelacion"
                                            checked={!!whatsappConfig.notificar_cancelacion} 
                                            onChange={handleWhatsappChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                                        <span className="ml-3 text-sm font-semibold text-gray-600">
                                            {whatsappConfig.notificar_cancelacion ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </label>
                                </div>
                                <textarea
                                    name="plantilla_cancelacion"
                                    value={whatsappConfig.plantilla_cancelacion}
                                    onChange={handleWhatsappChange}
                                    rows="3"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white transition-opacity disabled:opacity-50"
                                    disabled={!whatsappConfig.notificar_cancelacion}
                                    placeholder="Hola [CLIENTE], te informamos que tu cita de [SERVICIO] fue cancelada..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-gray-100 mt-8">
                            <button
                                type="submit" disabled={savingWhatsapp}
                                className="bg-[#25D366] hover:bg-[#1fa14d] text-white font-bold py-3 px-8 rounded-xl transition shadow-lg flex items-center disabled:opacity-50"
                            >
                                {savingWhatsapp ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                                {savingWhatsapp ? 'Guardando...' : 'Guardar Plantillas'}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'sistema' && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* Section Respaldo */}
                        <div className="border border-blue-100 rounded-2xl p-6 bg-blue-50/10">
                            <h4 className="font-bold text-gray-800 text-lg mb-2 flex items-center"><FaDatabase className="mr-2 text-blue-500"/> Copia de Seguridad</h4>
                            <p className="text-sm text-gray-600 mb-6">Descarga un archivo en formato bruto (.sql) con toda la información de clientes, contabilidad, reportes, citas y configuración. Consérvalo en un lugar seguro.</p>
                            <button
                                onClick={handleDownloadBackup}
                                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-md w-full sm:w-auto"
                            >
                                Descargar Copia de Seguridad
                            </button>
                        </div>

                        {/* Section Restaurar */}
                        <div className="border border-orange-200 rounded-2xl p-6 bg-orange-50/30">
                            <h4 className="font-bold text-gray-800 text-lg mb-2 flex items-center"><FaDatabase className="mr-2 text-orange-500"/> Restaurar Sistema</h4>
                            <p className="text-sm text-gray-600 mb-6">Sube un archivo de Base de Datos (.sql) generado previamente por el Salón para inyectar y recuperar información perdida. <strong className="text-orange-700">¡Atención! Esto destruirá los datos del mes actual para reescribir los pasados.</strong></p>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <input
                                    type="file"
                                    accept=".sql"
                                    onChange={(e) => setRestoreFile(e.target.files[0])}
                                    className="bg-white border border-gray-200 text-sm rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 file:cursor-pointer flex-1 w-full"
                                />
                                <button
                                    onClick={handleRestoreBackup}
                                    disabled={!restoreFile || restoring}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-8 rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center w-full sm:w-auto"
                                >
                                    {restoring ? <FaSpinner className="animate-spin mr-2"/> : null}
                                    Restaurar e Inyectar
                                </button>
                            </div>
                        </div>

                        {/* Section Reset */}
                        <div className="border border-red-200 rounded-2xl p-6 bg-red-50">
                            <h4 className="font-bold text-red-700 text-lg mb-2 flex items-center"><FaExclamationTriangle className="mr-2"/> Restablecimiento de Fábrica</h4>
                            <p className="text-sm text-red-800 mb-6">
                                Ejecuta una purga total de la base de datos operativa. Las listas de <strong>clientes, ventas, citas, inventario y reportes</strong> se esfumarán para siempre. Usar de forma exclusiva si se requiere preparar esta instancia para un negocio completamente nuevo o venta de franquicia.
                            </p>
                            <button
                                onClick={handleFactoryReset}
                                disabled={resetting}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl transition shadow-md disabled:opacity-50 flex items-center w-full sm:w-auto"
                            >
                                {resetting ? <FaSpinner className="animate-spin mr-2"/> : null}
                                Purgar Sistema (Irreversible)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Configuracion;
