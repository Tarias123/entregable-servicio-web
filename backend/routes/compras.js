const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, estado } = req.query;
        const conditions = [];
        const params = [];

        if (startDate && endDate) {
            conditions.push('DATE(c.fecha) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        if (estado) {
            conditions.push('c.estado = ?');
            params.push(estado);
        }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows] = await pool.query(`
            SELECT
                c.id, c.cantidad, c.costo, c.fecha, c.estado, c.creado_en,
                p.nombre   AS producto_nombre,
                p.imagen_url,
                pr.nombre  AS proveedor_nombre,
                a.nombre   AS almacen_nombre,
                u.nombre   AS usuario_nombre,
                c.producto_id, c.proveedor_id, c.almacen_destino_id, c.usuario_id
            FROM compras c
            JOIN  productos  p  ON p.id  = c.producto_id
            LEFT JOIN proveedores pr ON pr.id = c.proveedor_id
            LEFT JOIN almacenes  a  ON a.id  = c.almacen_destino_id
            LEFT JOIN usuarios   u  ON u.id  = c.usuario_id
            ${where}
            ORDER BY c.creado_en DESC
        `, params);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { proveedor_id, producto_id, cantidad, costo, fecha, usuario_id } = req.body;
    if (!producto_id || !cantidad || !costo || !fecha) {
        return res.status(400).json({ error: 'producto_id, cantidad, costo y fecha son requeridos.' });
    }
    try {
        const [result] = await pool.query(`
            INSERT INTO compras (proveedor_id, producto_id, cantidad, costo, fecha, usuario_id, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
        `, [proveedor_id || null, producto_id, cantidad, costo, fecha, usuario_id || null]);

        res.status(201).json({ id: result.insertId, message: 'Compra registrada. Pendiente de almacenar.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/almacenar', async (req, res) => {
    const { id } = req.params;
    const { almacen_destino_id, usuario_id } = req.body;

    if (!almacen_destino_id) {
        return res.status(400).json({ error: 'Debes indicar el almacen_destino_id.' });
    }

    if (![1, 2].includes(parseInt(almacen_destino_id))) {
        return res.status(400).json({ error: 'Solo puedes almacenar en AlmacÃ©n Principal (1) o Consumos (2).' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[compra]] = await conn.query('SELECT * FROM compras WHERE id=?', [id]);
        if (!compra) {
            await conn.rollback();
            return res.status(404).json({ error: 'Compra no encontrada.' });
        }
        if (compra.estado === 'almacenado') {
            await conn.rollback();
            return res.status(400).json({ error: 'Esta compra ya fue almacenada.' });
        }

        const { producto_id, cantidad, costo } = compra;

        await conn.query(`
            INSERT INTO stock (producto_id, almacen_id, cantidad)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cantidad = cantidad + ?
        `, [producto_id, almacen_destino_id, cantidad, cantidad]);

        await conn.query(`
            INSERT INTO kardex (producto_id, almacen_id, tipo, cantidad, costo, referencia_tipo, referencia_id, usuario_id)
            VALUES (?, ?, 'entrada', ?, ?, 'compra', ?, ?)
        `, [producto_id, almacen_destino_id, cantidad, costo, id, usuario_id || null]);

        await conn.query(
            'UPDATE compras SET almacen_destino_id=?, estado="almacenado" WHERE id=?',
            [almacen_destino_id, id]
        );

        await conn.commit();
        res.json({ message: 'Compra almacenada correctamente.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [[compra]] = await pool.query('SELECT estado FROM compras WHERE id=?', [id]);
        if (!compra) return res.status(404).json({ error: 'Compra no encontrada.' });
        if (compra.estado === 'almacenado') {
            return res.status(400).json({ error: 'No se puede eliminar una compra ya almacenada.' });
        }
        await pool.query('DELETE FROM compras WHERE id=?', [id]);
        res.json({ message: 'Compra eliminada.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

