const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const params = [];
        let where = '';

        if (startDate && endDate) {
            where = 'WHERE DATE(g.fecha) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        const query = `
            SELECT g.*, u.nombre as usuario_nombre
            FROM gastos g
            LEFT JOIN usuarios u ON g.usuario_id = u.id
            ${where}
            ORDER BY g.fecha DESC, g.creado_en DESC
        `;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { concepto, descripcion, monto, fecha, categoria, usuario_id } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO gastos (concepto, descripcion, monto, fecha, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
            [concepto, descripcion, monto, fecha, categoria, usuario_id]
        );
        res.status(201).json({
            id: result.insertId, concepto, descripcion, monto, fecha, categoria, usuario_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { concepto, descripcion, monto, fecha, categoria } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE gastos SET concepto = ?, descripcion = ?, monto = ?, fecha = ?, categoria = ? WHERE id = ?',
            [concepto, descripcion, monto, fecha, categoria, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        res.json({ message: 'Gasto actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM gastos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

