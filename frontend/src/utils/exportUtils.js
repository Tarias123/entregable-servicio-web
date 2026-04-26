import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title, columns, data, filename = 'reporte.pdf') => {
    try {
        const doc = new jsPDF();
        
        doc.text(title, 14, 15);
        
        const keys = columns.map(c => c.key);
        const head = [columns.map(c => c.label)];
        const body = data.map(row => keys.map(key => {
            const val = row[key] !== undefined && row[key] !== null ? row[key] : '';
            return typeof val === 'object' ? '' : String(val);
        }));

        autoTable(doc, {
            startY: 20,
            head: head,
            body: body,
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [164, 44, 161] } // #a42ca1
        });

        doc.save(filename);
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Ocurrió un error al generar el documento PDF.");
    }
};

export const exportToExcel = (data, filename = 'reporte.xlsx') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
};

export const printTable = (title, columns, data) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor habilita las ventanas emergentes (Pop-ups) para imprimir.");
        return; 
    }

    const keys = columns.map(c => c.key);

    let html = `
    <html>
    <head>
        <title>${title}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            h1 { color: #a42ca1; text-align: center; font-size: 24px; margin-bottom: 20px; }
            table { w-full; border-collapse: collapse; margin-top: 10px; font-size: 14px; width: 100%; }
            th, td { border: 1px solid #e5e7eb; padding: 12px 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 12px; }
            tr:nth-child(even) { background-color: #fbfbfb; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
            @media print {
                body { padding: 0; }
                .footer { display: none; }
            }
        </style>
    </head>
    <body onload="window.print(); window.close();">
        <h1>${title}</h1>
        <table>
            <thead>
                <tr>
                    ${columns.map(c => `<th>${c.label}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr>
                        ${keys.map(key => {
                            const val = row[key] !== undefined && row[key] !== null ? row[key] : '';
                            return `<td>${typeof val === 'object' ? '' : val}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="footer">Generado automáticamente por Belleza Admin</div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
