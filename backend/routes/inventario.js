const express = require('express');
const router = express.Router();
const pool = require('../db');
const { upload, cloudinary } = require('../config/cloudinary');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', (req, res) => {
    upload.single('imagen')(req, res, async (err) => {
        if (err) {
            console.error('Error Cloudinary upload:', err);
            return res.status(500).json({ error: err.message || 'Error al subir imagen' });
        }
        const { nombre, descripcion, precio, stock } = req.body;
        const imagen_url = req.file ? req.file.path : null;
        try {
            const [result] = await pool.query(
                'INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url) VALUES (?, ?, ?, ?, ?)',
                [nombre, descripcion, precio, stock || 0, imagen_url]
            );
            res.status(201).json({ id: result.insertId, nombre, descripcion, precio, stock, imagen_url });
        } catch (dbErr) {
            console.error('Error DB:', dbErr);
            res.status(500).json({ error: dbErr.message });
        }
    });
});

router.put('/:id', (req, res) => {
    upload.single('imagen')(req, res, async (err) => {
        if (err) {
            console.error('Error Cloudinary upload:', err);
            return res.status(500).json({ error: err.message || 'Error al subir imagen' });
        }
        const { id } = req.params;
        const { nombre, descripcion, precio, stock } = req.body;
        let imagen_url = req.body.imagen_url_actual || null;
        if (req.file) imagen_url = req.file.path;

        try {
            const [result] = await pool.query(
                'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen_url = ? WHERE id = ?',
                [nombre, descripcion, precio, stock, imagen_url, id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            res.json({ message: 'Producto actualizado correctamente', imagen_url });
        } catch (dbErr) {
            console.error('Error DB:', dbErr);
            res.status(500).json({ error: dbErr.message });
        }
    });
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

