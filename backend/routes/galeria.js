const express = require('express');
const router = express.Router();
const pool = require('../db');
const { upload, cloudinary } = require('../config/cloudinary');

router.post('/upload', (req, res) => {
    upload.single('foto')(req, res, async (err) => {
        if (err) {
            console.error('Error Cloudinary upload:', err);
            return res.status(500).json({ error: err.message || 'Error al subir imagen' });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se incluyÃ³ ninguna foto en la peticiÃ³n.' });
            }

            const { cliente_id, cita_id, tipo, descripcion } = req.body;

            if (!cliente_id) {
                return res.status(400).json({ error: 'El ID del cliente es obligatorio.' });
            }

            const urlFoto = req.file.path; 

            const parsedCitaId = cita_id && cita_id !== "null" && cita_id !== "" ? parseInt(cita_id) : null;

            const [result] = await pool.query(
                `INSERT INTO galeria_clientes (cliente_id, cita_id, url_foto, tipo, descripcion)
                 VALUES (?, ?, ?, ?, ?)`,
                [cliente_id, parsedCitaId, urlFoto, tipo || 'general', descripcion || null]
            );

            res.status(201).json({
                id: result.insertId,
                cliente_id: cliente_id,
                cita_id: parsedCitaId,
                url_foto: urlFoto,
                tipo: tipo || 'general',
                descripcion: descripcion || null,
                mensaje: 'Foto subida y guardada exitosamente.'
            });
        } catch (dbErr) {
            console.error('Error DB:', dbErr);
            res.status(500).json({ error: dbErr.message });
        }
    });
});

router.get('/cliente/:clienteId', async (req, res) => {
    const { clienteId } = req.params;
    try {
        const [rows] = await pool.query(`
            SELECT g.*, c.fecha_hora as fecha_cita, s.nombre as servicio_nombre
            FROM galeria_clientes g
            LEFT JOIN citas c ON g.cita_id = c.id
            LEFT JOIN servicios s ON c.servicio_id = s.id
            WHERE g.cliente_id = ?
            ORDER BY g.fecha_subida DESC
        `, [clienteId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {

        const [rows] = await pool.query('SELECT url_foto FROM galeria_clientes WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada.' });
        }

        const urlFoto = rows[0].url_foto;

        if (urlFoto && urlFoto.includes('cloudinary.com')) {
            try {

                const parts = urlFoto.split('/');
                const uploadIndex = parts.indexOf('upload');

                const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
                const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudErr) {
                console.error('Error eliminando de Cloudinary:', cloudErr);

            }
        }

        await pool.query('DELETE FROM galeria_clientes WHERE id = ?', [id]);

        res.json({ message: 'Foto eliminada correctamente de la galerÃ­a.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

