const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM proveedores ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { nombre, ruc, telefono, email, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
    try {
        const [result] = await pool.query(
            'INSERT INTO proveedores (nombre, ruc, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
            [nombre, ruc || null, telefono || null, email || null, direccion || null]
        );
        res.status(201).json({ id: result.insertId, nombre, ruc, telefono, email, direccion });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, ruc, telefono, email, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
    try {
        const [result] = await pool.query(
            'UPDATE proveedores SET nombre=?, ruc=?, telefono=?, email=?, direccion=? WHERE id=?',
            [nombre, ruc || null, telefono || null, email || null, direccion || null, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Proveedor no encontrado.' });
        res.json({ message: 'Proveedor actualizado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM proveedores WHERE id=?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Proveedor no encontrado.' });
        res.json({ message: 'Proveedor eliminado correctamente.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

