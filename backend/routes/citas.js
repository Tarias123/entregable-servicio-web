const express = require('express');
const router = express.Router();
const pool = require('../db');
const whatsappService = require('../services/whatsappService');

router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, estado } = req.query;
        const params = [];
        const conditions = [];
        if (startDate && endDate) {
            conditions.push('DATE(c.fecha_hora) BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }
        if (estado) {
            conditions.push('c.estado = ?');
            params.push(estado);
        }
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const query = `
      SELECT c.id, c.fecha_hora, c.estado, c.creado_en,
             c.cliente_id, c.servicio_id, c.usuario_id,
             cl.nombre AS cliente_nombre,
             s.nombre AS servicio_nombre, s.precio, s.duracion_minutos,
             u.nombre AS estilista_nombre,
             COALESCE(SUM(p.monto), 0) AS total_abonado
      FROM citas c
      JOIN clientes cl ON c.cliente_id = cl.id
      JOIN servicios s ON c.servicio_id = s.id
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN pagos p ON c.id = p.cita_id
      ${whereClause}
      GROUP BY c.id, c.fecha_hora, c.estado, c.creado_en, cl.nombre, s.nombre, s.precio, s.duracion_minutos, u.nombre
      ORDER BY c.fecha_hora DESC
    `;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { cliente_id, servicio_id, usuario_id, fecha_hora } = req.body;
    try {

        const [servicioInfo] = await pool.query('SELECT duracion_minutos FROM servicios WHERE id = ?', [servicio_id]);
        if (servicioInfo.length === 0) return res.status(400).json({ error: 'Servicio no encontrado.' });

        const duracionMinutos = servicioInfo[0].duracion_minutos;
        const fechaInicioReq = new Date(fecha_hora);
        const fechaFinReq = new Date(fechaInicioReq.getTime() + duracionMinutos * 60000);

        const [citasExistentes] = await pool.query(`
            SELECT c.id, c.fecha_hora, s.duracion_minutos
            FROM citas c
            JOIN servicios s ON c.servicio_id = s.id
            WHERE c.usuario_id = ? AND c.estado IN ('pendiente', 'confirmada')
            AND DATE(c.fecha_hora) = DATE(?)
        `, [usuario_id, fecha_hora]);

        for (let cita of citasExistentes) {
            const inicioExistente = new Date(cita.fecha_hora);
            const finExistente = new Date(inicioExistente.getTime() + cita.duracion_minutos * 60000);

            if (fechaInicioReq < finExistente && fechaFinReq > inicioExistente) {
                return res.status(400).json({ error: 'El estilista seleccionado ya tiene una cita que se cruza con este horario.' });
            }
        }

        const [result] = await pool.query(
            'INSERT INTO citas (cliente_id, servicio_id, usuario_id, fecha_hora) VALUES (?, ?, ?, ?)',
            [cliente_id, servicio_id, usuario_id, fecha_hora]
        );

        whatsappService.triggerNewAppointmentAlert(result.insertId).catch(e => console.error('Fallo disparando alerta WhatsApp:', e));

        res.status(201).json({ id: result.insertId, cliente_id, servicio_id, usuario_id, fecha_hora, estado: 'pendiente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function cascadaInsumos(conn, citaId, nuevoEstado) {
    if (nuevoEstado === 'cancelada') {

        const [consumos] = await conn.query(
            'SELECT id, insumo_id FROM consumos_insumos WHERE cita_id = ? AND estado = "pendiente"',
            [citaId]
        );
        for (const consumo of consumos) {

            await conn.query(
                `UPDATE insumos_activos
                 SET usos_restantes = usos_restantes + 1, estado = 'activo'
                 WHERE id = ?`,
                [consumo.insumo_id]
            );

            await conn.query(
                'UPDATE consumos_insumos SET estado = "cancelado" WHERE id = ?',
                [consumo.id]
            );
        }
    } else if (nuevoEstado === 'completada') {

        await conn.query(
            'UPDATE consumos_insumos SET estado = "confirmado" WHERE cita_id = ? AND estado = "pendiente"',
            [citaId]
        );
    }
}

router.patch('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, id]);

        if (estado === 'completada') {
            const [cita] = await conn.query(`
                SELECT c.id, s.precio
                FROM citas c
                JOIN servicios s ON c.servicio_id = s.id
                WHERE c.id = ?`, [id]);

            if (cita.length > 0) {
                await conn.query('INSERT INTO ventas (cita_id, total) VALUES (?, ?)', [id, cita[0].precio]);
            }
        }

        await cascadaInsumos(conn, id, estado);

        await conn.commit();

        if (estado === 'cancelada') {
            whatsappService.triggerCancellationAlert(id).catch(e => console.error('Fallo disparando alerta de cancelaciÃ³n WhatsApp:', e));
        }

        res.json({ message: 'Estado actualizado correctamente' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { cliente_id, servicio_id, usuario_id, fecha_hora, estado } = req.body;
    try {

        if (estado === 'pendiente' || estado === 'confirmada') {
            const [servicioInfo] = await pool.query('SELECT duracion_minutos FROM servicios WHERE id = ?', [servicio_id]);
            if (servicioInfo.length === 0) return res.status(400).json({ error: 'Servicio no encontrado.' });

            const duracionMinutos = servicioInfo[0].duracion_minutos;
            const fechaInicioReq = new Date(fecha_hora);
            const fechaFinReq = new Date(fechaInicioReq.getTime() + duracionMinutos * 60000);

            const [citasExistentes] = await pool.query(`
                SELECT c.id, c.fecha_hora, s.duracion_minutos
                FROM citas c
                JOIN servicios s ON c.servicio_id = s.id
                WHERE c.usuario_id = ? AND c.estado IN ('pendiente', 'confirmada')
                AND DATE(c.fecha_hora) = DATE(?)
            `, [usuario_id, fecha_hora]);

            for (let cita of citasExistentes) {
                if (parseInt(cita.id) === parseInt(id)) continue; 

                const inicioExistente = new Date(cita.fecha_hora);
                const finExistente = new Date(inicioExistente.getTime() + cita.duracion_minutos * 60000);

                if (fechaInicioReq < finExistente && fechaFinReq > inicioExistente) {
                    return res.status(400).json({ error: 'El estilista seleccionado ya tiene una cita que se cruza con este horario modificado.' });
                }
            }
        }

        const [citaActual] = await pool.query('SELECT estado FROM citas WHERE id = ?', [id]);
        const estadoAnterior = citaActual.length > 0 ? citaActual[0].estado : null;
        const nuevoEstado = estado || 'pendiente';

        const [result] = await pool.query(
            'UPDATE citas SET cliente_id = ?, servicio_id = ?, usuario_id = ?, fecha_hora = ?, estado = ? WHERE id = ?',
            [cliente_id, servicio_id, usuario_id, fecha_hora, nuevoEstado, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        if (estadoAnterior !== nuevoEstado) {
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();
                await cascadaInsumos(conn, id, nuevoEstado);
                await conn.commit();
            } catch (cascadeErr) {
                await conn.rollback();
                console.error('Error en cascada de insumos:', cascadeErr);
            } finally {
                conn.release();
            }
        }

        res.json({ message: 'Cita actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM citas WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        res.json({ message: 'Cita eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

