import { FaFilePdf, FaFileExcel, FaPrint } from 'react-icons/fa';
import { exportToPDF, exportToExcel, printTable } from '../utils/exportUtils';

function ExportButtons({ title, columns, data, fileName }) {
    
    const handlePDF = () => {
        exportToPDF(title, columns, data, `${fileName}.pdf`);
    };

    const handleExcel = () => {
        const flatData = data.map(item => {
            let row = {};
            columns.forEach(c => {
                const val = item[c.key];
                row[c.label] = typeof val === 'object' ? '' : val;
            });
            return row;
        });
        exportToExcel(flatData, `${fileName}.xlsx`);
    };

    const handlePrint = () => {
        printTable(title, columns, data);
    };

    return (
        <div className="flex space-x-2">
            <button 
                onClick={handlePrint}
                className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all shadow-sm hover:scale-105"
                title="Imprimir"
            >
                <FaPrint size={18} />
            </button>
            <button 
                onClick={handleExcel}
                className="flex items-center justify-center w-10 h-10 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-500 rounded-xl transition-all shadow-sm hover:scale-105"
                title="Exportar a Excel"
            >
                <FaFileExcel size={18} />
            </button>
            <button 
                onClick={handlePDF}
                className="flex items-center justify-center w-10 h-10 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-rose-500 rounded-xl transition-all shadow-sm hover:scale-105"
                title="Exportar a PDF"
            >
                <FaFilePdf size={18} />
            </button>
        </div>
    );
}

export default ExportButtons;
