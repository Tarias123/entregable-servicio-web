const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const params = [];
        let whereClause = '';
        if (startDate && endDate) {
            whereClause = 'WHERE DATE(v.fecha) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        const query = `
            SELECT v.id, v.total, v.metodo_pago, v.fecha,
                   c.fecha_hora AS cita_fecha, c.estado AS cita_estado,
                   cl.nombre AS cliente_nombre,
                   s.nombre AS servicio_nombre
            FROM ventas v
            LEFT JOIN citas c ON v.cita_id = c.id
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN servicios s ON c.servicio_id = s.id
            ${whereClause}
            ORDER BY v.fecha DESC
        `;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

