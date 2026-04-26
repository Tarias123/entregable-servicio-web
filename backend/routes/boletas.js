const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, orden } = req.query;
        let query = "SELECT * FROM boletas WHERE estado_pago = 'completada'";
        const params = [];

        if (startDate && endDate) {
            query += ' AND DATE(creado_en) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        query += orden === 'antiguo'
            ? ' ORDER BY creado_en ASC'
            : ' ORDER BY creado_en DESC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const {
        ticket_code, cita_id, pago_id,
        cliente_nombre, estilista_nombre, servicio_nombre,
        monto_pagado, total_abonado, total_servicio,
        estado_pago, saldo_pendiente
    } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO boletas
             (ticket_code, cita_id, pago_id, cliente_nombre, estilista_nombre, servicio_nombre,
              monto_pagado, total_abonado, total_servicio, estado_pago, saldo_pendiente)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ticket_code, cita_id, pago_id,
                cliente_nombre, estilista_nombre, servicio_nombre,
                monto_pagado, total_abonado, total_servicio,
                estado_pago, saldo_pendiente
            ]
        );
        res.status(201).json({ id: result.insertId, ticket_code });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(200).json({ message: 'Boleta ya registrada', ticket_code });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

