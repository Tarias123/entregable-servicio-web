const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/cita/:citaId', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pagos WHERE cita_id = ? ORDER BY fecha ASC', [req.params.citaId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { cita_id, pagos: pagosInput, monto, metodo_pago } = req.body;

    const pagos = Array.isArray(pagosInput)
        ? pagosInput
        : [{ monto, metodo_pago }];

    try {

        let lastInsertId;
        for (const p of pagos) {
            const [result] = await pool.query(
                'INSERT INTO pagos (cita_id, monto, metodo_pago) VALUES (?, ?, ?)',
                [cita_id, parseFloat(p.monto), p.metodo_pago]
            );
            lastInsertId = result.insertId;
        }

        const [sumaRows] = await pool.query(
            'SELECT COALESCE(SUM(monto), 0) as total_abonado FROM pagos WHERE cita_id = ?',
            [cita_id]
        );
        const totalAbonado = parseFloat(sumaRows[0].total_abonado);
        const montoEsteAbono = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);

        const [citaRows] = await pool.query(`
            SELECT c.estado, s.precio
            FROM citas c
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.id = ?
        `, [cita_id]);

        if (citaRows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada.' });
        }

        const precioTotal = parseFloat(citaRows[0].precio);
        let nuevoEstado = citaRows[0].estado;

        if (totalAbonado >= precioTotal && nuevoEstado !== 'completada' && nuevoEstado !== 'cancelada') {
            await pool.query('UPDATE citas SET estado = "completada" WHERE id = ?', [cita_id]);
            nuevoEstado = 'completada';

            const [[{ metodos_pago }]] = await pool.query(
                `SELECT GROUP_CONCAT(DISTINCT metodo_pago ORDER BY metodo_pago SEPARATOR ' + ') AS metodos_pago
                 FROM pagos WHERE cita_id = ?`,
                [cita_id]
            );
            await pool.query(
                'INSERT INTO ventas (cita_id, total, metodo_pago) VALUES (?, ?, ?)',
                [cita_id, precioTotal, metodos_pago]
            );
        }

        res.status(201).json({
            id: lastInsertId,
            cita_id,
            monto: montoEsteAbono,
            metodo_pago: pagos.map(p => p.metodo_pago).join(' + '),
            total_abonado: totalAbonado,
            precio_total: precioTotal,
            nuevo_estado: nuevoEstado
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM pagos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
        res.json({ message: 'Pago eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

