import { useState, useEffect, useContext } from 'react';
import { FaCalendarPlus, FaCheck, FaTimes, FaUser, FaCut, FaClock, FaEdit, FaTrash, FaMoneyBillWave, FaFilter, FaPrint, FaPlus, FaMinus, FaArrowLeft, FaFlask, FaBoxOpen } from 'react-icons/fa';
import Swal from 'sweetalert2';
import api from '../services/api';
import { pagosService } from '../services/pagosService';
import { ConfigContext } from '../context/ConfigContext';
import { AuthContext } from '../context/AuthContext';
import ExportButtons from '../components/ExportButtons';

function Citas() {
    const { config } = useContext(ConfigContext);
    const { user } = useContext(AuthContext);
    const [citas, setCitas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [servicios, setServicios] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: null, cliente_id: '', servicio_id: '', usuario_id: user?.id, fecha_hora: '', estado: 'pendiente' });

    // Insumos en cita
    const [insumosDisponibles, setInsumosDisponibles] = useState([]);
    const [insumosSeleccionados, setInsumosSeleccionados] = useState([]);
    const [showCrearInsumoModal, setShowCrearInsumoModal] = useState(false);
    const [productosInventario, setProductosInventario] = useState([]);
    const [formNuevoInsumo, setFormNuevoInsumo] = useState({ producto_id: '', usos_totales: '', notas: '' });
    const [guardandoInsumo, setGuardandoInsumo] = useState(false);

    // Filtros y orden
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [sortOrder, setSortOrder] = useState('reciente');

    // Modal de abonos
    const [showAbonoModal, setShowAbonoModal] = useState(false);
    const [currentCitaAbono, setCurrentCitaAbono] = useState(null);
    const [historialPagos, setHistorialPagos] = useState([]);
    const [tipoPago, setTipoPago] = useState(null);
    const [pagosForm, setPagosForm] = useState([{ monto: '', metodo_pago: 'efectivo' }]);
    const [lastPago, setLastPago] = useState(null);
    const [submitting, setSubmitting] = useState(false);       // evita doble-click
    const [isCompletingPartial, setIsCompletingPartial] = useState(false); // modo completar abono previo

    const fetchData = async (sd = '', ed = '') => {
        try {
            let citasUrl = '/citas';
            if (sd && ed) citasUrl += `?startDate=${sd}&endDate=${ed}`;
            const [citasRes, clientesRes, servsRes, usuariosRes] = await Promise.all([
                api.get(citasUrl),
                api.get('/clientes'),
                api.get('/servicios'),
                api.get('/usuarios')
            ]);
            setCitas(citasRes.data);
            setClientes(clientesRes.data);
            setServicios(servsRes.data);
            setUsuarios(usuariosRes.data.filter(u => u.rol === 'estilista' || u.rol === 'recepcionista'));
        } catch (error) {
            console.error('Error fetching citas data:', error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const fetchInsumosDisponibles = async () => {
        try {
            const [insumosRes, productosRes] = await Promise.all([
                api.get('/insumos'),
                api.get('/inventario')
            ]);
            setInsumosDisponibles(insumosRes.data.filter(i => i.estado === 'activo'));
            setProductosInventario(productosRes.data.filter(p => p.stock > 0));
        } catch (err) {
            console.error('Error cargando insumos:', err);
        }
    };

    const citasFiltradas = citas
        .filter(c => filterEstado === 'todos' || c.estado === filterEstado)
        .sort((a, b) => {
            const da = new Date(a.fecha_hora), db = new Date(b.fecha_hora);
            return sortOrder === 'reciente' ? db - da : da - db;
        });

    const isCerrada = (estado) => estado === 'completada' || estado === 'cancelada';

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let citaId = formData.id;
            if (isEditing) {
                await api.put(`/citas/${citaId}`, formData);
            } else {
                const res = await api.post('/citas', formData);
                citaId = res.data.id;
            }

            // Vincular insumos seleccionados a la cita
            for (const insumo of insumosSeleccionados) {
                try {
                    await api.post(`/insumos/${insumo.id}/usar`, { cita_id: citaId });
                } catch (err) {
                    console.error(`Error vinculando insumo ${insumo.id}:`, err);
                }
            }

            const textoInsumos = insumosSeleccionados.length > 0
                ? ` Se vincularon ${insumosSeleccionados.length} insumo(s).`
                : '';

            Swal.fire({
                icon: 'success',
                title: isEditing ? 'Actualizado' : 'Agendado',
                text: (isEditing ? 'Cita actualizada correctamente.' : 'Cita reservada correctamente.') + textoInsumos,
                timer: 2000,
                showConfirmButton: false
            });

            setShowModal(false);
            setFormData({ id: null, cliente_id: '', servicio_id: '', usuario_id: user?.id, fecha_hora: '', estado: 'pendiente' });
            setInsumosSeleccionados([]);
            setIsEditing(false);
            fetchData();
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'No se pudo guardar la cita.';
            Swal.fire({ icon: 'error', title: 'No disponible', text: errorMessage, confirmButtonColor: '#a42ca1' });
        }
    };

    const handleEdit = (cita) => {
        let formattedDate = cita.fecha_hora;
        if (formattedDate) {
            const dateObj = new Date(formattedDate);
            const tzOffset = dateObj.getTimezoneOffset() * 60000;
            formattedDate = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
        }
        setFormData({ ...cita, fecha_hora: formattedDate });
        setInsumosSeleccionados([]);
        fetchInsumosDisponibles();
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?', text: 'No podrás revertir esto!', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar!'
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/citas/${id}`);
                Swal.fire('Eliminada!', 'La cita ha sido eliminada.', 'success');
                fetchData();
            } catch {
                Swal.fire('Error', 'No se pudo eliminar la cita.', 'error');
            }
        }
    };

    const handleUpdateStatus = async (id, estado) => {
        try {
            await api.patch(`/citas/${id}/estado`, { estado });
            fetchData();
        } catch (error) {
            console.error('Error updating cita status:', error);
        }
    };

    // Abre el modal de abono — detecta si hay abonos previos para ir directo a "Completar"
    const handleOpenAbono = async (cita) => {
        setCurrentCitaAbono(cita);
        setLastPago(null);
        setSubmitting(false);

        const saldo = Math.max(0, parseFloat(cita.precio) - parseFloat(cita.total_abonado || 0));
        const hasPrior = parseFloat(cita.total_abonado || 0) > 0 && saldo > 0;

        if (hasPrior) {
            // Hay abono previo → modo completar directo
            setIsCompletingPartial(true);
            setTipoPago('completo');
            setPagosForm([{ monto: saldo.toFixed(2), metodo_pago: 'efectivo' }]);
        } else {
            setIsCompletingPartial(false);
            setTipoPago(null);
            setPagosForm([{ monto: '', metodo_pago: 'efectivo' }]);
        }

        try {
            const pagos = await pagosService.getPagosPorCita(cita.id);
            setHistorialPagos(pagos);
        } catch {
            setHistorialPagos([]);
        }
        setShowAbonoModal(true);
    };

    const seleccionarTipo = (tipo, saldo) => {
        setTipoPago(tipo);
        if (tipo === 'completo') {
            setPagosForm([{ monto: saldo.toFixed(2), metodo_pago: 'efectivo' }]);
        } else {
            setPagosForm([{ monto: '', metodo_pago: 'efectivo' }]);
        }
    };

    const fmtTicketDate = (d) => {
        const f = new Date(d);
        return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}/${f.getFullYear()} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`;
    };
    const dos = (s) => (s || '-').trim().split(/\s+/).slice(0, 2).join(' ');

    const generarTicketHTML = ({ ticketCode, fechaStr, emisionStr, salonName, moneda,
        cliente, estilista, servicio, monto, totalAbonado, totalServicio,
        estadoPago, saldoPendiente }) => `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Ticket ${ticketCode}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:58mm auto;margin:1mm;}
    body{font-family:'Courier New',Courier,monospace;font-size:9pt;color:#000;background:#fff;width:56mm;padding:0 1mm;}
    .sep{border-top:1px dashed #000;margin:5px 0;}
    .salon{font-size:10pt;font-weight:bold;text-align:center;margin-bottom:1px;}
    .sub{font-size:8pt;text-align:center;margin-bottom:2px;}
    .field{margin:2px 0;font-size:9pt;}
    .ticket-val{font-weight:bold;}
    .lbl2{font-size:8pt;margin-top:3px;}
    .val2{font-size:9pt;margin-bottom:1px;}
    .estado-ok{text-align:center;font-size:9pt;margin:4px 0;}
    .estado-pend{text-align:center;font-size:9pt;margin:4px 0;}
    .footer{font-size:8pt;text-align:center;margin-top:5px;}
  </style>
</head><body>
  <div class="salon">${salonName}</div>
  <div class="sub">Tu salon de confianza</div>
  <div class="sep"></div>
  <div class="field">Ticket: <span class="ticket-val">${ticketCode}</span></div>
  <div class="field">Fecha de atencion: ${fechaStr}</div>
  <div class="lbl2">Fecha de emision de boleta:</div>
  <div class="val2">${emisionStr}</div>
  <div class="sep"></div>
  <div class="field">Cliente: ${cliente}</div>
  <div class="field">Estilista: ${estilista}</div>
  <div class="field">Servicio: ${servicio}</div>
  <div class="sep"></div>
  <div class="field">Monto pagado: ${moneda}${monto}</div>
  <div class="field">Total abonado: ${moneda}${totalAbonado}</div>
  <div class="field">Total servicio: ${moneda}${totalServicio}</div>
  <div class="sep"></div>
  ${estadoPago === 'completada'
    ? `<div class="estado-ok">*** PAGADO COMPLETAMENTE ***</div>`
    : `<div class="estado-pend">Pendiente: ${moneda}${parseFloat(saldoPendiente).toFixed(2)}</div>`}
  <div class="sep"></div>
  <div class="footer">* Vuelve pronto *</div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body></html>`;

    const printTicket = (pagoResult, cita) => {
        const moneda = config?.simbolo_moneda || '$';
        const salonName = config?.nombre_negocio || 'Salon de Belleza';
        const html = generarTicketHTML({
            ticketCode:    pagoResult.ticket_code,
            fechaStr:      fmtTicketDate(cita.fecha_hora),
            emisionStr:    fmtTicketDate(new Date()),
            salonName, moneda,
            cliente:       dos(cita.cliente_nombre),
            estilista:     dos(cita.estilista_nombre),
            servicio:      cita.servicio_nombre,
            monto:         parseFloat(pagoResult.monto).toFixed(2),
            totalAbonado:  parseFloat(pagoResult.total_abonado).toFixed(2),
            totalServicio: parseFloat(pagoResult.precio_total).toFixed(2),
            estadoPago:    'completada',
            saldoPendiente: 0,
        });
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        window.open(URL.createObjectURL(blob), '_blank', 'width=280,height=600');
    };

    const handleAbonar = async (e) => {
        e.preventDefault();
        if (!currentCitaAbono || !tipoPago || submitting) return;

        setSubmitting(true); // 🔒 bloquea doble-click
        try {
            const result = await pagosService.registrarPago({
                cita_id: currentCitaAbono.id,
                pagos: pagosForm.map(p => ({ monto: parseFloat(p.monto), metodo_pago: p.metodo_pago }))
            });

            fetchData();

            const pagosActualizados = await pagosService.getPagosPorCita(currentCitaAbono.id);
            setHistorialPagos(pagosActualizados);

            const updatedCita = { ...currentCitaAbono, total_abonado: result.total_abonado, estado: result.nuevo_estado };
            setCurrentCitaAbono(updatedCita);

            if (result.nuevo_estado === 'completada' && tipoPago !== 'parcial') {
                // Pago completo → generar boleta y ticket
                const d = new Date();
                const datePart = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
                const ticketCode = `TK-${datePart}-${result.id}`;
                result.ticket_code = ticketCode;

                try {
                    await api.post('/boletas', {
                        ticket_code:      ticketCode,
                        cita_id:          currentCitaAbono.id,
                        pago_id:          result.id,
                        cliente_nombre:   currentCitaAbono.cliente_nombre,
                        estilista_nombre: currentCitaAbono.estilista_nombre,
                        servicio_nombre:  currentCitaAbono.servicio_nombre,
                        monto_pagado:     result.monto,
                        total_abonado:    result.total_abonado,
                        total_servicio:   result.precio_total,
                        estado_pago:      'completada',
                        saldo_pendiente:  0,
                    });
                } catch { /* no bloquear flujo */ }

                setLastPago({ ...result, cita: currentCitaAbono });
                setTipoPago(null);
                setPagosForm([{ monto: '', metodo_pago: 'efectivo' }]);
                setIsCompletingPartial(false);
                Swal.fire({ icon: 'success', title: '¡Pagado y Completado!', text: 'Pago registrado. Ya puedes imprimir la boleta.', confirmButtonColor: '#10b981', timer: 2000, showConfirmButton: false });

            } else if (tipoPago === 'parcial') {
                // Abono parcial → actualizar saldo y volver a modo "Completar"
                const newSaldo = Math.max(0, parseFloat(updatedCita.precio) - parseFloat(result.total_abonado));
                if (newSaldo > 0) {
                    setIsCompletingPartial(true);
                    setTipoPago('completo');
                    setPagosForm([{ monto: newSaldo.toFixed(2), metodo_pago: 'efectivo' }]);
                } else {
                    setTipoPago(null);
                    setPagosForm([{ monto: '', metodo_pago: 'efectivo' }]);
                    setIsCompletingPartial(false);
                }
                Swal.fire({ icon: 'success', title: 'Abono Registrado', text: 'El pago parcial se guardó correctamente.', timer: 1500, showConfirmButton: false });
            }

        } catch (error) {
            console.error('Error al registrar abono', error);
            Swal.fire('Error', error.response?.data?.error || 'No se pudo guardar el pago.', 'error');
        } finally {
            setSubmitting(false); // 🔓 desbloquea siempre
        }
    };

    const getStatusBadge = (cita) => {
        // Cita confirmada con abono parcial → badge especial
        if (cita.estado === 'confirmada' && parseFloat(cita.total_abonado || 0) > 0) {
            return (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600">
                    Pago Parcial
                </span>
            );
        }
        const statusMap = {
            pendiente:  { bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Pendiente' },
            confirmada: { bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'Confirmada' },
            completada: { bg: 'bg-green-100',  text: 'text-green-600',  label: 'Completada' },
            cancelada:  { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Cancelada' },
        };
        const s = statusMap[cita.estado] || statusMap.pendiente;
        return <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
    };

    const exportColumns = [
        { label: 'Fecha/Hora', key: 'fecha_hora' },
        { label: 'Cliente', key: 'cliente_nombre' },
        { label: 'Servicio', key: 'servicio_nombre' },
        { label: 'Estilista', key: 'estilista_nombre' },
        { label: 'Estado', key: 'estado' },
        { label: 'Costo', key: 'precio' },
        { label: 'Abonado', key: 'total_abonado' }
    ];

    // Computed antes del return
    const saldoPendienteAbono = currentCitaAbono
        ? Math.max(0, parseFloat(currentCitaAbono.precio) - parseFloat(currentCitaAbono.total_abonado || 0))
        : 0;
    const totalIngresado = pagosForm.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
    const abonoExcede = totalIngresado > saldoPendienteAbono + 0.001;
    const abonoIncompleto = pagosForm.some(p => !p.monto || parseFloat(p.monto) <= 0);
    const mixtoNoIgualaSaldo = tipoPago === 'mixto' && !abonoIncompleto && Math.abs(totalIngresado - saldoPendienteAbono) > 0.01;
    const parcialEsTotal = tipoPago === 'parcial' && !abonoIncompleto && totalIngresado >= saldoPendienteAbono - 0.001;
    const submitDisabled = submitting || abonoIncompleto || abonoExcede || mixtoNoIgualaSaldo || parcialEsTotal;

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 sm:space-y-0">
                <h2 className="text-2xl font-bold text-gray-800">Agenda de Citas</h2>
                <div className="flex items-center space-x-4">
                    <ExportButtons title="Agenda de Citas" columns={exportColumns} data={citas} fileName="reporte_citas" />
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setFormData({ id: null, cliente_id: '', servicio_id: '', usuario_id: user?.id, fecha_hora: '', estado: 'pendiente' });
                            setInsumosSeleccionados([]);
                            fetchInsumosDisponibles();
                            setShowModal(true);
                        }}
                        className="flex items-center space-x-2 px-6 py-2.5 rounded-full text-white font-semibold shadow-md transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                    >
                        <FaCalendarPlus /> <span>Agendar Cita</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="border-b border-gray-100 pb-4 mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
                        <FaFilter className="text-gray-400" /> Fecha:
                    </span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50" />
                    <span className="text-gray-400 text-sm">—</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50" />
                    <button onClick={() => fetchData(startDate, endDate)} disabled={!startDate || !endDate}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}>
                        Filtrar
                    </button>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); fetchData('', ''); }}
                            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-colors">
                            <FaTimes size={12} /> Limpiar
                        </button>
                    )}
                    <div className="w-px h-6 bg-gray-200 mx-1 self-center hidden sm:block"></div>
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50 text-gray-700">
                        <option value="todos">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                    </select>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50 text-gray-700">
                        <option value="reciente">Más reciente primero</option>
                        <option value="antiguo">Más antiguo primero</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                                <th className="pb-4 font-semibold">Fecha y Hora</th>
                                <th className="pb-4 font-semibold">Cliente</th>
                                <th className="pb-4 font-semibold">Servicio</th>
                                <th className="pb-4 font-semibold">Estilista</th>
                                <th className="pb-4 font-semibold">Estado</th>
                                <th className="pb-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citasFiltradas.length === 0 ? (
                                <tr><td colSpan="6" className="py-8 text-center text-gray-400">No hay citas agendadas.</td></tr>
                            ) : (
                                citasFiltradas.map((cita) => (
                                    <tr key={cita.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 text-gray-800 font-medium">
                                            {new Date(cita.fecha_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="py-4 text-gray-600 font-medium">{cita.cliente_nombre}</td>
                                        <td className="py-4 text-gray-600">
                                            {cita.servicio_nombre}
                                            <div className="text-xs">
                                                <span className="text-gray-400">Total: {config?.simbolo_moneda || '$'}{cita.precio}</span>
                                                {parseFloat(cita.total_abonado) > 0 && (
                                                    <span className="ml-2 text-green-600 font-semibold bg-green-50 px-1 rounded">
                                                        Abonado: {config?.simbolo_moneda || '$'}{cita.total_abonado}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 text-gray-600">{cita.estilista_nombre}</td>
                                        <td className="py-4 whitespace-nowrap">{getStatusBadge(cita)}</td>
                                        <td className="py-4 flex justify-end items-center space-x-1">
                                            {cita.estado === 'confirmada' && (
                                                <button onClick={() => handleOpenAbono(cita)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors font-bold flex items-center"
                                                    title="Registrar Pago">
                                                    <FaMoneyBillWave size={15} />
                                                    <span className="ml-1 text-xs">Abonar</span>
                                                </button>
                                            )}
                                            {cita.estado === 'pendiente' && (
                                                <button onClick={() => handleUpdateStatus(cita.id, 'confirmada')}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Confirmar">
                                                    <FaCheck size={14} />
                                                </button>
                                            )}
                                            {!isCerrada(cita.estado) && (
                                                <button onClick={() => handleUpdateStatus(cita.id, 'cancelada')}
                                                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors" title="Cancelar">
                                                    <FaTimes size={14} />
                                                </button>
                                            )}
                                            <div className="w-px h-6 bg-gray-200 mx-1 self-center hidden sm:block"></div>
                                            <button onClick={() => handleEdit(cita)} disabled={isCerrada(cita.estado)}
                                                className="p-2 text-gray-400 hover:text-blue-500 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Editar">
                                                <FaEdit size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(cita.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors" title="Eliminar">
                                                <FaTrash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nueva/Editar Cita */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FaCalendarPlus className="text-[#a42ca1]" /> {isEditing ? 'Editar Cita' : 'Nueva Cita'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaUser className="text-gray-400" /> Cliente</label>
                                <select required value={formData.cliente_id} onChange={e => setFormData({ ...formData, cliente_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800">
                                    <option value="" disabled>Seleccionar un cliente...</option>
                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaCut className="text-gray-400" /> Servicio</label>
                                <select required value={formData.servicio_id} onChange={e => setFormData({ ...formData, servicio_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800">
                                    <option value="" disabled>Seleccionar un servicio...</option>
                                    {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - {config?.simbolo_moneda || '$'}{parseFloat(s.precio)} ({s.duracion_minutos}m)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaUser className="text-gray-400" /> Estilista</label>
                                <select required value={formData.usuario_id || ''} onChange={e => setFormData({ ...formData, usuario_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800">
                                    <option value="" disabled>Seleccionar un estilista...</option>
                                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FaClock className="text-gray-400" /> Fecha y Hora</label>
                                <input type="datetime-local" required value={formData.fecha_hora} onChange={e => setFormData({ ...formData, fecha_hora: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-800" />
                            </div>
                            {/* Sección de insumos */}
                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                        <FaFlask className="text-[#a42ca1]" /> Insumos para esta cita
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setFormNuevoInsumo({ producto_id: '', usos_totales: '', notas: '' }); setShowCrearInsumoModal(true); }}
                                        className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg text-[#a42ca1] border border-[#a42ca1]/30 hover:bg-[#a42ca1]/5 transition-colors"
                                    >
                                        <FaPlus size={9} /> Nuevo insumo
                                    </button>
                                </div>

                                {insumosDisponibles.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-xl">
                                        No hay insumos activos. Crea uno con el botón de arriba.
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                        {insumosDisponibles.map(insumo => {
                                            const seleccionado = insumosSeleccionados.some(i => i.id === insumo.id);
                                            return (
                                                <div
                                                    key={insumo.id}
                                                    onClick={() => {
                                                        if (seleccionado) {
                                                            setInsumosSeleccionados(prev => prev.filter(i => i.id !== insumo.id));
                                                        } else {
                                                            setInsumosSeleccionados(prev => [...prev, insumo]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${seleccionado ? 'border-[#a42ca1] bg-[#a42ca1]/5' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${seleccionado ? 'bg-[#a42ca1] border-[#a42ca1]' : 'border-gray-300'}`}>
                                                        {seleccionado && <FaCheck size={8} className="text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-700 truncate">{insumo.nombre_producto}</p>
                                                        <p className="text-xs text-gray-400">{insumo.usos_restantes} uso(s) restantes</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {insumosSeleccionados.length > 0 && (
                                    <p className="text-xs text-[#a42ca1] font-medium mt-2">
                                        {insumosSeleccionados.length} insumo(s) seleccionado(s)
                                    </p>
                                )}
                            </div>

                            <div className="flex space-x-4 mt-6">
                                <button type="button" onClick={() => { setShowModal(false); setIsEditing(false); setInsumosSeleccionados([]); }}
                                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={clientes.length === 0 || servicios.length === 0}
                                    className="flex-1 px-4 py-2 text-white rounded-xl font-medium shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(90deg, #811e86 0%, #30176b 100%)' }}>
                                    Agendar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mini-modal: Crear nuevo insumo desde cita */}
            {showCrearInsumoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaFlask className="text-[#a42ca1]" /> Nuevo insumo
                            </h4>
                            <button onClick={() => setShowCrearInsumoModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Producto del inventario *</label>
                                <select
                                    value={formNuevoInsumo.producto_id}
                                    onChange={e => setFormNuevoInsumo({ ...formNuevoInsumo, producto_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] outline-none bg-gray-50 text-sm"
                                >
                                    <option value="">-- Selecciona un producto --</option>
                                    {productosInventario.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} (Stock: {p.stock})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usos estimados *</label>
                                <input
                                    type="number" min="1"
                                    value={formNuevoInsumo.usos_totales}
                                    onChange={e => setFormNuevoInsumo({ ...formNuevoInsumo, usos_totales: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a42ca1] outline-none bg-gray-50 text-sm"
                                    placeholder="Ej: 5"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCrearInsumoModal(false)}
                                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={!formNuevoInsumo.producto_id || !formNuevoInsumo.usos_totales || guardandoInsumo}
                                    onClick={async () => {
                                        try {
                                            setGuardandoInsumo(true);
                                            const res = await api.post('/insumos/abrir', {
                                                producto_id: parseInt(formNuevoInsumo.producto_id),
                                                usos_totales: parseInt(formNuevoInsumo.usos_totales),
                                                notas: formNuevoInsumo.notas
                                            });
                                            // Auto-seleccionar el nuevo insumo
                                            const nuevoInsumo = {
                                                id: res.data.id,
                                                nombre_producto: res.data.nombre_producto,
                                                usos_restantes: res.data.usos_restantes
                                            };
                                            setInsumosSeleccionados(prev => [...prev, nuevoInsumo]);
                                            setShowCrearInsumoModal(false);
                                            // Recargar lista de insumos
                                            fetchInsumosDisponibles();
                                        } catch (err) {
                                            Swal.fire('Error', err.response?.data?.error || 'No se pudo crear el insumo.', 'error');
                                        } finally {
                                            setGuardandoInsumo(false);
                                        }
                                    }}
                                    className="flex-1 py-2 text-white rounded-xl text-sm font-medium shadow-md transition-all hover:scale-105 disabled:opacity-50"
                                    style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}
                                >
                                    {guardandoInsumo ? 'Creando...' : 'Crear y seleccionar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Abonos */}
            {showAbonoModal && currentCitaAbono && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {/* Flecha atrás solo si no estamos en modo "completar" y hay tipo seleccionado */}
                                {tipoPago && !isCompletingPartial && (
                                    <button onClick={() => { setTipoPago(null); setPagosForm([{ monto: '', metodo_pago: 'efectivo' }]); }}
                                        className="text-gray-400 hover:text-gray-600 mr-1">
                                        <FaArrowLeft size={14} />
                                    </button>
                                )}
                                <FaMoneyBillWave className="text-[#a42ca1]" />
                                {isCompletingPartial ? ' Completar Pago' : ' Registrar Pago'}
                            </h3>
                            <button onClick={() => setShowAbonoModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                        </div>

                        {/* Resumen de la cita */}
                        <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-100 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Cliente:</span>
                                <span className="font-medium text-gray-800">{currentCitaAbono.cliente_nombre}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Servicio:</span>
                                <span className="font-medium text-gray-800">{currentCitaAbono.servicio_nombre}</span>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-gray-500">Total:</span>
                                <span className="font-bold text-gray-800">{config?.simbolo_moneda || '$'}{currentCitaAbono.precio}</span>
                            </div>
                            {parseFloat(currentCitaAbono.total_abonado || 0) > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Abonado:</span>
                                    <span>{config?.simbolo_moneda || '$'}{currentCitaAbono.total_abonado}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 my-1"></div>
                            <div className="flex justify-between font-bold text-red-500">
                                <span>Saldo pendiente:</span>
                                <span>{config?.simbolo_moneda || '$'}{saldoPendienteAbono.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Historial de pagos */}
                        {historialPagos.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Historial de Pagos</h4>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                    {historialPagos.map((pago, idx) => (
                                        <div key={idx} className="text-sm flex justify-between items-center bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                                            <div>
                                                <span className="font-bold text-gray-800">{config?.simbolo_moneda || '$'}{pago.monto}</span>
                                                <span className="ml-2 text-[10px] text-gray-400">{new Date(pago.fecha).toLocaleString()}</span>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-md">{pago.metodo_pago}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botón imprimir boleta si ya se generó en esta sesión */}
                        {lastPago && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">
                                    Ticket: <span className="font-mono font-bold">{lastPago.ticket_code}</span>
                                </span>
                                <button onClick={() => printTicket(lastPago, lastPago.cita)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors">
                                    <FaPrint size={13} /> Imprimir
                                </button>
                            </div>
                        )}

                        {saldoPendienteAbono > 0 ? (
                            /* Si hay tipo seleccionado (o estamos en modo completar), mostrar formulario */
                            tipoPago ? (
                                <form onSubmit={handleAbonar} className="space-y-3">
                                    {/* Badge de tipo — solo si NO es modo completar */}
                                    {!isCompletingPartial && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                tipoPago === 'completo' ? 'bg-green-100 text-green-700' :
                                                tipoPago === 'mixto'    ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {tipoPago === 'completo' ? '💵 Pago Completo' : tipoPago === 'mixto' ? '🔀 Pago Mixto' : '📋 Pago Parcial'}
                                            </span>
                                            {tipoPago === 'parcial' && (
                                                <span className="text-[11px] text-amber-600">No genera boleta</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Fila(s) de monto + método */}
                                    {pagosForm.map((row, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="number" required min="0.01" step="0.01"
                                                readOnly={tipoPago === 'completo' || isCompletingPartial}
                                                placeholder="Monto"
                                                value={row.monto}
                                                onChange={e => {
                                                    if (tipoPago === 'completo' || isCompletingPartial) return;
                                                    const updated = [...pagosForm];
                                                    updated[idx] = { ...updated[idx], monto: e.target.value };
                                                    setPagosForm(updated);
                                                }}
                                                className={`flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none text-gray-800 ${(tipoPago === 'completo' || isCompletingPartial) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                                            />
                                            <select
                                                value={row.metodo_pago}
                                                onChange={e => {
                                                    const updated = [...pagosForm];
                                                    updated[idx] = { ...updated[idx], metodo_pago: e.target.value };
                                                    setPagosForm(updated);
                                                }}
                                                className="px-2 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent outline-none bg-gray-50 text-gray-700"
                                            >
                                                <option value="efectivo">Efectivo</option>
                                                <option value="tarjeta">Tarjeta</option>
                                                <option value="transferencia">Transferencia</option>
                                                <option value="yape">Yape</option>
                                            </select>
                                            {tipoPago === 'mixto' && pagosForm.length > 1 && (
                                                <button type="button" onClick={() => setPagosForm(pagosForm.filter((_, i) => i !== idx))}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                                    <FaMinus size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Agregar método (solo en mixto, máx 4) */}
                                    {tipoPago === 'mixto' && pagosForm.length < 4 && (
                                        <button type="button"
                                            onClick={() => setPagosForm([...pagosForm, { monto: '', metodo_pago: 'efectivo' }])}
                                            className="flex items-center gap-1 text-sm text-[#a42ca1] hover:underline">
                                            <FaPlus size={11} /> Agregar método
                                        </button>
                                    )}

                                    {/* Totalizador (solo mixto y parcial) */}
                                    {tipoPago !== 'completo' && !isCompletingPartial && (
                                        <div className={`text-sm flex justify-between font-semibold ${
                                            abonoExcede ? 'text-red-500' :
                                            tipoPago === 'mixto' && !abonoIncompleto && Math.abs(totalIngresado - saldoPendienteAbono) <= 0.01 ? 'text-green-600' :
                                            'text-gray-600'
                                        }`}>
                                            <span>Total:</span>
                                            <span>{config?.simbolo_moneda || '$'}{totalIngresado.toFixed(2)} / {config?.simbolo_moneda || '$'}{saldoPendienteAbono.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {mixtoNoIgualaSaldo && <p className="text-xs text-amber-600">El total debe ser exactamente el saldo pendiente.</p>}
                                    {abonoExcede && <p className="text-xs text-red-500">El monto supera el saldo pendiente.</p>}
                                    {parcialEsTotal && <p className="text-xs text-amber-600">Para pagar el total elige "Completo" o "Mixto".</p>}

                                    <button type="submit" disabled={submitDisabled}
                                        className="w-full mt-2 px-4 py-3 text-white rounded-xl font-bold shadow-md transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        style={{ background: 'linear-gradient(90deg, #10b981 0%, #047857 100%)' }}>
                                        {submitting ? 'Procesando...' :
                                         isCompletingPartial ? `Completar Pago (${config?.simbolo_moneda || '$'}${saldoPendienteAbono.toFixed(2)})` :
                                         tipoPago === 'parcial' ? 'Guardar Abono' : 'Confirmar Pago y Generar Boleta'}
                                    </button>
                                </form>
                            ) : (
                                /* Sin tipo seleccionado → mostrar selector */
                                <div>
                                    <h4 className="text-sm font-bold text-gray-600 mb-3 text-center">¿Cómo deseas pagar?</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button onClick={() => seleccionarTipo('completo', saldoPendienteAbono)}
                                            className="flex flex-col items-center p-4 border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-2xl transition-all group">
                                            <span className="text-2xl mb-1">💵</span>
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-green-700">Completo</span>
                                            <span className="text-[10px] text-gray-400 text-center mt-1">Un solo método</span>
                                        </button>
                                        <button onClick={() => seleccionarTipo('mixto', saldoPendienteAbono)}
                                            className="flex flex-col items-center p-4 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all group">
                                            <span className="text-2xl mb-1">🔀</span>
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">Mixto</span>
                                            <span className="text-[10px] text-gray-400 text-center mt-1">Varios métodos</span>
                                        </button>
                                        <button onClick={() => seleccionarTipo('parcial', saldoPendienteAbono)}
                                            className="flex flex-col items-center p-4 border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl transition-all group">
                                            <span className="text-2xl mb-1">📋</span>
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-amber-700">Parcial</span>
                                            <span className="text-[10px] text-gray-400 text-center mt-1">Abono parcial</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-center p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl font-bold flex flex-col items-center">
                                <FaCheck size={22} className="mb-2" />
                                Esta cita ya está completamente pagada.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Citas;
