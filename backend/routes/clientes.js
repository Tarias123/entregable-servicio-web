const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = 'SELECT * FROM clientes';
        const params = [];
        if (startDate && endDate) {
            query += ' WHERE DATE(creado_en) BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        query += ' ORDER BY creado_en DESC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { nombre, telefono, email, whatsapp_apikey } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO clientes (nombre, telefono, email, whatsapp_apikey) VALUES (?, ?, ?, ?)', [nombre, telefono, email, whatsapp_apikey || null]);
        res.status(201).json({ id: result.insertId, nombre, telefono, email, whatsapp_apikey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, email, whatsapp_apikey } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE clientes SET nombre = ?, telefono = ?, email = ?, whatsapp_apikey = ? WHERE id = ?',
            [nombre, telefono, email, whatsapp_apikey || null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

