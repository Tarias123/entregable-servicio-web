import { useState, useEffect, useContext } from 'react';
import { FaChartBar, FaCalendarAlt, FaMoneyBillWave, FaUserTie, FaFilter, FaCut } from 'react-icons/fa';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../services/api';
import { ConfigContext } from '../context/ConfigContext';
import ExportButtons from '../components/ExportButtons';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

function Reportes() {
    const { config } = useContext(ConfigContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fechas por defecto: Últimos 30 días
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [startDate, setStartDate] = useState(last30Days.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchReportes = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/reportes?startDate=${startDate}&endDate=${endDate}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching reportes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportes();
    }, []);

    const handleFilter = (e) => {
        e.preventDefault();
        fetchReportes();
    };

    const formatCurrency = (amount) => {
        return (config?.simbolo_moneda || '$') + parseFloat(amount).toLocaleString();
    };

    if (loading || !data) {
        return (
            <div className="h-full flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#a42ca1]"></div>
            </div>
        );
    }

    // Configuración Gráfico Métodos de Pago (Doughnut)
    const metodosLabels = data.metodos_pago.map(m => m.metodo_pago.charAt(0).toUpperCase() + m.metodo_pago.slice(1));
    const metodosDataValues = data.metodos_pago.map(m => m.subtotal);
    const metodosChartData = {
        labels: metodosLabels,
        datasets: [{
            data: metodosDataValues,
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    // Configuración Gráfico Desempeño Estilistas (Bar)
    const estilistasLabels = data.desempeno_personal.map(p => p.estilista);
    const estilistasDataValues = data.desempeno_personal.map(p => p.total_generado);
    const estilistasChartData = {
        labels: estilistasLabels,
        datasets: [{
            label: `Total Facturado (${config?.simbolo_moneda || '$'})`,
            data: estilistasDataValues,
            backgroundColor: '#a42ca1',
            borderRadius: 6,
        }]
    };
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { border: { display: false }, grid: { color: '#f3f4f6' } },
            x: { border: { display: false }, grid: { display: false } }
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 animation-fade-in relative z-0">
            {/* Cabecera y Filtros */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FaChartBar className="text-[#a42ca1] mr-3" /> Reportes Administrativos
                    </h1>
                    <p className="text-gray-500 mt-1">Analiza el rendimiento del salón en un rango de fechas determinado.</p>
                </div>

                <form onSubmit={handleFilter} className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 bg-gray-50 p-3 rounded-2xl w-full md:w-auto">
                    <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="text-gray-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent"
                            required
                        />
                    </div>
                    <span className="text-gray-400 font-medium hidden sm:inline">-</span>
                    <div className="flex items-center space-x-2">
                        <FaCalendarAlt className="text-gray-400" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#a42ca1] focus:border-transparent"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full sm:w-auto bg-[#31186b] hover:bg-[#a42ca1] text-white p-2.5 rounded-xl transition-colors shadow-sm focus:outline-none">
                        <FaFilter />
                    </button>
                </form>
            </div>

            {/* KPI Principal */}
            <div className="bg-gradient-to-r from-[#a42ca1] to-[#31186b] rounded-3xl p-8 shadow-md text-white flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium opacity-80 mb-1">Total de Ingresos del Periodo</h2>
                    <p className="text-5xl font-bold">{formatCurrency(data.resumen.total_ingresos)}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                    <FaMoneyBillWave size={32} />
                </div>
            </div>

            {/* Gráficas y Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                {/* Métodos de pago (Doughnut) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 col-span-1 flex flex-col items-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 self-start w-full border-b pb-2">Ingresos por Método</h3>

                    {data.metodos_pago.length > 0 ? (
                        <>
                            <div className="relative w-48 h-48 mb-6">
                                <Doughnut data={metodosChartData} options={{ plugins: { legend: { display: false } } }} />
                            </div>
                            <div className="w-full space-y-3">
                                {data.metodos_pago.map((m, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium capitalize flex items-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: metodosChartData.datasets[0].backgroundColor[idx % 4] }}></span>
                                            {m.metodo_pago}
                                        </span>
                                        <span className="font-bold text-gray-800">{formatCurrency(m.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">No hay ventas registradas.</div>
                    )}
                </div>

                {/* Desempeño Estilistas (Bar) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 col-span-1 lg:col-span-2 flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2 space-y-3 sm:space-y-0">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center"><FaUserTie className="mr-2 text-[#a42ca1]" /> Desempeño del Personal</h3>
                        {data?.desempeno_personal && data.desempeno_personal.length > 0 && (
                            <ExportButtons 
                                title="Rendimiento de Estilistas" 
                                columns={[{label: 'Estilista', key: 'estilista'}, {label: 'Citas Atendidas', key: 'citas_completadas'}, {label: 'Monto Generado', key: 'total_generado'}]} 
                                data={data.desempeno_personal} 
                                fileName={`rendimiento_personal_${startDate}`} 
                            />
                        )}
                    </div>

                    {data.desempeno_personal.length > 0 ? (
                        <div className="h-64 w-full mt-2 mb-6">
                            <Bar data={estilistasChartData} options={barOptions} />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 mb-6 h-64 border-dashed border-2 m-2 rounded-xl">No hay citas completadas en el periodo.</div>
                    )}

                    {/* Tabla Top Estilistas */}
                    {data.desempeno_personal.length > 0 && (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500">
                                        <th className="pb-2 font-semibold">Estilista</th>
                                        <th className="pb-2 font-semibold">Citas Atendidas</th>
                                        <th className="pb-2 font-semibold text-right">Monto Generado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.desempeno_personal.map((p, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 text-gray-800 font-medium">{p.estilista}</td>
                                            <td className="py-3 text-gray-600 font-medium">
                                                <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-bold">{p.citas_completadas}</span>
                                            </td>
                                            <td className="py-3 font-bold text-gray-800 text-right text-[#31186b]">{formatCurrency(p.total_generado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Servicios más populares */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 col-span-1 lg:col-span-3">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center"><FaCut className="mr-2 text-[#a42ca1]" /> Servicios Más Agendados</h3>

                    {data.servicios_populares.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {data.servicios_populares.map((s, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                                    <div className="flex items-center font-medium text-gray-700">
                                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex justify-center items-center text-xs font-bold mr-3 shadow-inner">
                                            #{idx + 1}
                                        </div>
                                        {s.servicio}
                                    </div>
                                    <span className="font-bold text-xl text-gray-800">{s.cantidad}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 flex text-center items-center justify-center text-gray-400">No hay servicios consumidos en este periodo.</div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default Reportes;
