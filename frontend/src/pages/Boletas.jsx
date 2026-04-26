import { useState, useEffect, useContext } from 'react';
import { FaFilter, FaTimes, FaReceipt, FaPrint } from 'react-icons/fa';
import api from '../services/api';
import { ConfigContext } from '../context/ConfigContext';

function Boletas() {
    const { config } = useContext(ConfigContext);
    const [boletas, setBoletas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [orden, setOrden] = useState('reciente');

    const fetchBoletas = async (sd = '', ed = '', ord = 'reciente') => {
        setLoading(true);
        try {
            const params = { orden: ord };
            if (sd && ed) { params.startDate = sd; params.endDate = ed; }
            const res = await api.get('/boletas', { params });
            setBoletas(res.data);
        } catch (e) {
            console.error('Error cargando boletas:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBoletas(); }, []);

    const handleFiltrar = () => fetchBoletas(startDate, endDate, orden);
    const handleLimpiar = () => { setStartDate(''); setEndDate(''); fetchBoletas('', '', orden); };

    const moneda = config?.simbolo_moneda || '$';
    const salonName = config?.nombre_negocio || 'Salon de Belleza';

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

    const reimprimir = (b) => {
        const html = generarTicketHTML({
            ticketCode:    b.ticket_code,
            fechaStr:      fmtTicketDate(b.creado_en),
            emisionStr:    fmtTicketDate(new Date()),
            salonName,
            moneda,
            cliente:       dos(b.cliente_nombre),
            estilista:     dos(b.estilista_nombre),
            servicio:      b.servicio_nombre,
            monto:         parseFloat(b.monto_pagado).toFixed(2),
            totalAbonado:  parseFloat(b.total_abonado).toFixed(2),
            totalServicio: parseFloat(b.total_servicio).toFixed(2),
            estadoPago:    b.estado_pago,
            saldoPendiente: b.saldo_pendiente,
        });
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'width=280,height=600');
    };

    const fmtDate = (d) => new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    const estadoBadge = (estado) => {
        if (estado === 'completada') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">Pagado</span>;
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-600">Parcial</span>;
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 sm:space-y-0">
                <div className="flex items-center gap-3">
                    <FaReceipt className="text-[#a42ca1]" size={22} />
                    <h2 className="text-2xl font-bold text-gray-800">Boletas</h2>
                </div>
                <span className="text-sm text-gray-400">{boletas.length} boleta{boletas.length !== 1 ? 's' : ''} encontrada{boletas.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
                <div className="border-b border-gray-100 pb-4 mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
                        <FaFilter className="text-gray-400" /> Fecha:
                    </span>
                    <input type="date" value={startDate}
                        onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50" />
                    <span className="text-gray-400 text-sm">—</span>
                    <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50" />
                    <button onClick={handleFiltrar} disabled={!startDate || !endDate || endDate < startDate}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(90deg, #811e86 0%, #d82e88 100%)' }}>
                        Filtrar
                    </button>
                    {(startDate || endDate) && (
                        <button onClick={handleLimpiar} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-colors">
                            <FaTimes size={12} /> Limpiar
                        </button>
                    )}
                    <div className="w-px h-6 bg-gray-200 mx-1 self-center hidden sm:block"></div>
                    <select value={orden}
                        onChange={e => { setOrden(e.target.value); fetchBoletas(startDate, endDate, e.target.value); }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a42ca1]/20 focus:border-[#a42ca1] bg-gray-50 text-gray-700">
                        <option value="reciente">Más reciente primero</option>
                        <option value="antiguo">Más antiguo primero</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#a42ca1]"></div>
                        </div>
                    ) : boletas.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                            <FaReceipt size={32} className="text-gray-200" />
                            <span>No hay boletas registradas.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                                    <th className="pb-4 font-semibold">Código</th>
                                    <th className="pb-4 font-semibold">Cliente</th>
                                    <th className="pb-4 font-semibold">Servicio</th>
                                    <th className="pb-4 font-semibold">Estilista</th>
                                    <th className="pb-4 font-semibold">Monto</th>
                                    <th className="pb-4 font-semibold">Estado</th>
                                    <th className="pb-4 font-semibold">Fecha</th>
                                    <th className="pb-4 font-semibold text-right">Reimprimir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boletas.map((b) => (
                                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3">
                                            <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">{b.ticket_code}</span>
                                        </td>
                                        <td className="py-3 text-gray-800 font-medium">{b.cliente_nombre}</td>
                                        <td className="py-3 text-gray-600 text-sm">{b.servicio_nombre}</td>
                                        <td className="py-3 text-gray-500 text-sm">{b.estilista_nombre || '—'}</td>
                                        <td className="py-3 font-semibold text-gray-800">
                                            {moneda}{parseFloat(b.monto_pagado).toFixed(2)}
                                        </td>
                                        <td className="py-3">{estadoBadge(b.estado_pago)}</td>
                                        <td className="py-3 text-gray-500 text-sm">{fmtDate(b.creado_en)}</td>
                                        <td className="py-3 text-right">
                                            <button onClick={() => reimprimir(b)}
                                                className="p-2 text-[#a42ca1] hover:bg-[#a42ca1]/10 rounded-full transition-colors"
                                                title="Reimprimir ticket">
                                                <FaPrint size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Boletas;
