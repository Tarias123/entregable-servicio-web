const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        const d = new Date();
        endDate = d.toISOString().split('T')[0];
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split('T')[0];
    }

    try {

        const queryIngresos = `
            SELECT COALESCE(SUM(total), 0) AS total_ingresos 
            FROM ventas 
            WHERE DATE(fecha) BETWEEN ? AND ?
        `;
        const [ingresos] = await pool.query(queryIngresos, [startDate, endDate]);

        const queryMetodosPago = `
            SELECT metodo_pago, COALESCE(SUM(total), 0) as subtotal
            FROM ventas
            WHERE DATE(fecha) BETWEEN ? AND ?
            GROUP BY metodo_pago
        `;
        const [metodos] = await pool.query(queryMetodosPago, [startDate, endDate]);

        const queryDesempeno = `
            SELECT u.nombre as estilista, COUNT(c.id) as citas_completadas, COALESCE(SUM(v.total), 0) as total_generado
            FROM ventas v
            JOIN citas c ON v.cita_id = c.id
            JOIN usuarios u ON c.usuario_id = u.id
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY u.id, u.nombre
            ORDER BY total_generado DESC
        `;
        const [topEstilistas] = await pool.query(queryDesempeno, [startDate, endDate]);

        const queryServiciosPopulares = `
            SELECT s.nombre as servicio, COUNT(c.id) as cantidad
            FROM ventas v
            JOIN citas c ON v.cita_id = c.id
            JOIN servicios s ON c.servicio_id = s.id
            WHERE DATE(v.fecha) BETWEEN ? AND ?
            GROUP BY s.id, s.nombre
            ORDER BY cantidad DESC
        `;
        const [serviciosPopulares] = await pool.query(queryServiciosPopulares, [startDate, endDate]);

        res.json({
            periodo: { startDate, endDate },
            resumen: {
                total_ingresos: ingresos[0].total_ingresos
            },
            metodos_pago: metodos,
            desempeno_personal: topEstilistas,
            servicios_populares: serviciosPopulares
        });

    } catch (err) {
        console.error("Error en reporte:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

