const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const [almacenes] = await pool.query(`
            SELECT a.id, a.nombre, a.descripcion,
                   COUNT(DISTINCT s.producto_id) AS total_productos,
                   COALESCE(SUM(s.cantidad), 0) AS total_unidades
            FROM almacenes a
            LEFT JOIN stock s ON s.almacen_id = a.id
            GROUP BY a.id, a.nombre, a.descripcion
            ORDER BY a.id ASC
        `);
        res.json(almacenes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/stock', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT s.producto_id, s.cantidad,
                   p.nombre AS producto_nombre, p.precio, p.imagen_url
            FROM stock s
            JOIN productos p ON p.id = s.producto_id
            WHERE s.almacen_id = ?
            ORDER BY p.nombre ASC
        `, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

