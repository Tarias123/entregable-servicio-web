const mysql = require('mysql2/promise');

async function setupDatabase() {
  try {
    // Connect to MySQL server without selecting a database first
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('Connected to MySQL server.');

    // Create database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS salon_belleza_db;');
    console.log('Database salon_belleza_db created or already exists.');

    // Use the database
    await connection.query('USE salon_belleza_db;');

    // Create tables
    const createUsuariosTable = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol ENUM('admin', 'recepcionista', 'estilista') DEFAULT 'recepcionista',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createClientesTable = `
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(100),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createServiciosTable = `
      CREATE TABLE IF NOT EXISTS servicios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(10, 2) NOT NULL,
        duracion_minutos INT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createCitasTable = `
      CREATE TABLE IF NOT EXISTS citas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        servicio_id INT NOT NULL,
        usuario_id INT NOT NULL, -- The stylist/staff member assigned
        fecha_hora DATETIME NOT NULL,
        estado ENUM('pendiente', 'confirmada', 'completada', 'cancelada') DEFAULT 'pendiente',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `;

    const createVentasTable = `
      CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cita_id INT NULL,
        total DECIMAL(10, 2) NOT NULL,
        metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia') DEFAULT 'efectivo',
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE SET NULL
      );
    `;

    await connection.query(createUsuariosTable);
    console.log('Usuarios table ready.');
    await connection.query(createClientesTable);
    console.log('Clientes table ready.');
    await connection.query(createServiciosTable);
    console.log('Servicios table ready.');
    await connection.query(createCitasTable);
    console.log('Citas table ready.');
    await connection.query(createVentasTable);
    console.log('Ventas table ready.');

    // Insert a default admin user if no users exist
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM usuarios');
    if (rows[0].count === 0) {
      // Password is 'admin123' (not hashed for simplicity in setup script, we can update this later)
      // Actually let's use a plain password in DB for now, or use bcrypt later. 
      // We will hash it in the API, but for the mock we can just put a simple one.
      await connection.query(`
        INSERT INTO usuarios (nombre, email, password, rol) 
        VALUES ('Administrador', 'admin@salon.com', 'admin123', 'admin')
      `);
      console.log('Default admin user created: admin@salon.com / admin123');
    }

    console.log('Database setup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up the database:', error);
    process.exit(1);
  }
}

setupDatabase();
