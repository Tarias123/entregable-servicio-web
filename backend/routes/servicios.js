const express = require('express');
const router = express.Router();
const pool = require('../db');
const { upload } = require('../config/cloudinary');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM servicios ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    upload.single('imagen')(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message || 'Error al subir imagen' });
        const { nombre, descripcion, precio, duracion_minutos } = req.body;
        const imagen_url = req.file ? req.file.path : null;
        try {
            const [result] = await pool.query(
                'INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, imagen_url) VALUES (?, ?, ?, ?, ?)',
                [nombre, descripcion, precio, duracion_minutos, imagen_url]
            );
            res.status(201).json({ id: result.insertId, nombre, descripcion, precio, duracion_minutos, imagen_url });
        } catch (dbErr) {
            res.status(500).json({ error: dbErr.message });
        }
    });
});

router.put('/:id', (req, res) => {
    upload.single('imagen')(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message || 'Error al subir imagen' });
        const { id } = req.params;
        const { nombre, descripcion, precio, duracion_minutos } = req.body;
        let imagen_url = req.body.imagen_url_actual || null;
        if (req.file) imagen_url = req.file.path;
        try {
            const [result] = await pool.query(
                'UPDATE servicios SET nombre = ?, descripcion = ?, precio = ?, duracion_minutos = ?, imagen_url = ? WHERE id = ?',
                [nombre, descripcion, precio, duracion_minutos, imagen_url, id]
            );
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
            res.json({ message: 'Servicio actualizado correctamente', imagen_url });
        } catch (dbErr) {
            res.status(500).json({ error: dbErr.message });
        }
    });
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM servicios WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json({ message: 'Servicio eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

