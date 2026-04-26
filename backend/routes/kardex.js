const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { producto_id, almacen_id, tipo, startDate, endDate } = req.query;
        const conditions = [];
        const params = [];

        if (producto_id) { conditions.push('k.producto_id = ?'); params.push(producto_id); }
        if (almacen_id)  { conditions.push('k.almacen_id = ?');  params.push(almacen_id); }
        if (tipo)        { conditions.push('k.tipo = ?');         params.push(tipo); }
        if (startDate && endDate) {
            conditions.push('DATE(k.fecha) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows] = await pool.query(`
            SELECT
                k.id, k.tipo, k.cantidad, k.costo, k.referencia_tipo,
                k.referencia_id, k.notas, k.fecha,
                p.nombre  AS producto_nombre,
                a.nombre  AS almacen_nombre,
                u.nombre  AS usuario_nombre
            FROM kardex k
            JOIN productos  p ON p.id = k.producto_id
            JOIN almacenes  a ON a.id = k.almacen_id
            LEFT JOIN usuarios u ON u.id = k.usuario_id
            ${where}
            ORDER BY k.fecha DESC
            LIMIT 500
        `, params);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { producto_id, almacen_id, tipo, cantidad, costo, notas, usuario_id } = req.body;
    if (!producto_id || !almacen_id || !tipo || !cantidad) {
        return res.status(400).json({ error: 'producto_id, almacen_id, tipo y cantidad son requeridos.' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (tipo === 'entrada') {
            await conn.query(`
                INSERT INTO stock (producto_id, almacen_id, cantidad)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE cantidad = cantidad + ?
            `, [producto_id, almacen_id, cantidad, cantidad]);
        } else if (tipo === 'salida') {

            const [[stockRow]] = await conn.query(
                'SELECT cantidad FROM stock WHERE producto_id=? AND almacen_id=?',
                [producto_id, almacen_id]
            );
            const actual = stockRow ? parseInt(stockRow.cantidad) : 0;
            if (actual < parseInt(cantidad)) {
                await conn.rollback();
                return res.status(400).json({ error: `Stock insuficiente. Disponible: ${actual}` });
            }
            await conn.query(
                'UPDATE stock SET cantidad = cantidad - ? WHERE producto_id=? AND almacen_id=?',
                [cantidad, producto_id, almacen_id]
            );
        }

        const [result] = await conn.query(`
            INSERT INTO kardex (producto_id, almacen_id, tipo, cantidad, costo, referencia_tipo, usuario_id, notas)
            VALUES (?, ?, ?, ?, ?, 'manual', ?, ?)
        `, [producto_id, almacen_id, tipo, cantidad, costo || 0, usuario_id || null, notas || null]);

        await conn.commit();
        res.status(201).json({ id: result.insertId, message: 'Movimiento registrado correctamente.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

module.exports = router;

