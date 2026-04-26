const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
require('dotenv').config();

exports.backupDatabase = (req, res) => {
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'salon_belleza_db';
    const dbHost = process.env.DB_HOST || 'localhost';

    // Build args array — no shell needed, no > redirection issues on Windows
    const args = ['-h', dbHost, '-u', dbUser];
    if (dbPass) args.push(`-p${dbPass}`);
    args.push(dbName);

    const date = new Date().toISOString().split('T')[0];
    const filename = `respaldo_salon_${date}.sql`;

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const mysqldump = spawn('mysqldump', args);

    mysqldump.stdout.pipe(res);

    let stderrOutput = '';
    mysqldump.stderr.on('data', (data) => {
        stderrOutput += data.toString();
    });

    mysqldump.on('error', (err) => {
        console.error('mysqldump spawn error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'No se pudo ejecutar mysqldump. Asegúrese de que MySQL esté en el PATH del sistema.' });
        }
    });

    mysqldump.on('close', (code) => {
        if (code !== 0) {
            console.error(`mysqldump exited with code ${code}: ${stderrOutput}`);
        }
    });
};

exports.restoreDatabase = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo de respaldo.' });
    }

    const restoreFile = req.file.path;
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'salon_belleza_db';
    const dbHost = process.env.DB_HOST || 'localhost';

    const args = ['-h', dbHost, '-u', dbUser];
    if (dbPass) args.push(`-p${dbPass}`);
    args.push(dbName);

    const mysql = spawn('mysql', args);

    // Pipe the SQL file directly to mysql's stdin
    const fileStream = fs.createReadStream(restoreFile);
    fileStream.pipe(mysql.stdin);

    let stderrOutput = '';
    mysql.stderr.on('data', (data) => {
        stderrOutput += data.toString();
    });

    mysql.on('error', (err) => {
        console.error('mysql spawn error:', err);
        try { fs.unlinkSync(restoreFile); } catch(e) {}
        if (!res.headersSent) {
            res.status(500).json({ error: 'No se pudo ejecutar mysql. Verifique la instalación.' });
        }
    });

    mysql.on('close', (code) => {
        try { fs.unlinkSync(restoreFile); } catch(e) {}
        if (code !== 0) {
            console.error(`mysql restore exited code ${code}: ${stderrOutput}`);
            return res.status(500).json({ error: 'Error al restaurar. El archivo SQL puede estar corrupto o ser incompatible.' });
        }
        res.json({ message: 'Base de datos restaurada con éxito a partir de la copia.' });
    });
};

exports.resetDatabase = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

        const tablesToTruncate = [
            'mantenimiento_fotos',
            'mantenimiento_fisico',
            'pagos',
            'ventas',
            'gastos',
            'galeria_trabajos',
            'citas',
            'clientes',
            'servicios',
            'productos'
        ];

        for (const table of tablesToTruncate) {
            try {
                await connection.query(`TRUNCATE TABLE \`${table}\`;`);
            } catch (tableErr) {
                console.warn(`(Notice: Tabla ${table} omitida): ${tableErr.message}`);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
        connection.release();

        res.json({ message: 'El sistema ha sido purgado. Listo para un nuevo negocio.' });
    } catch (error) {
        if (connection) {
            try { await connection.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch(e) {}
            connection.release();
        }
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Error fatal al intentar purgar los datos operativos.' });
    }
};
