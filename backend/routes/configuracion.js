const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {

        const ext = path.extname(file.originalname);
        cb(null, 'logo_empresa_' + Date.now() + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imÃ¡genes.'));
        }
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM configuracion WHERE id = 1');
        if (rows.length === 0) {
            return res.status(404).json({ error: 'ConfiguraciÃ³n no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener configuraciÃ³n:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.get('/public', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT nombre_empresa, logo_url, simbolo_moneda FROM configuracion WHERE id = 1');
        if (rows.length === 0) {
            return res.status(404).json({ error: 'ConfiguraciÃ³n no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener configuraciÃ³n:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

router.put('/', authMiddleware, roleMiddleware(['admin']), upload.single('logo'), async (req, res) => {
    try {
        const { nombre_empresa, simbolo_moneda, telefono, direccion } = req.body;
        let updateQuery = 'UPDATE configuracion SET nombre_empresa = ?, simbolo_moneda = ?, telefono = ?, direccion = ?';
        let queryParams = [nombre_empresa, simbolo_moneda, telefono, direccion];

        if (req.file) {

            const logo_url = '/uploads/' + req.file.filename;
            updateQuery += ', logo_url = ?';
            queryParams.push(logo_url);
        }

        updateQuery += ' WHERE id = 1';

        await pool.query(updateQuery, queryParams);

        const [updated] = await pool.query('SELECT * FROM configuracion WHERE id = 1');
        res.json(updated[0]);

    } catch (error) {
        console.error('Error al actualizar configuraciÃ³n:', error);
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Error subiendo la imagen: ' + error.message });
        }
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;

