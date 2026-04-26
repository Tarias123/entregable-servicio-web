const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'salon_belleza_db'
        });

        console.log('Iniciando poblamiento de base de datos...');

        // 1. Usuarios (10 registros incluyendo el admin existente, así que agregamos 9)
        const passwordHash = await bcrypt.hash('123456', 10);
        const usuarios = [
            ['María Gómez', 'maria@salon.com', passwordHash, 'estilista'],
            ['Pedro Pérez', 'pedro@salon.com', passwordHash, 'estilista'],
            ['Ana Torres', 'ana@salon.com', passwordHash, 'estilista'],
            ['Luis Sánchez', 'luis@salon.com', passwordHash, 'estilista'],
            ['Laura Diaz', 'laura@salon.com', passwordHash, 'estilista'],
            ['Carlos Ruiz', 'carlos@salon.com', passwordHash, 'recepcionista'],
            ['Sofía López', 'sofia@salon.com', passwordHash, 'recepcionista'],
            ['Elena Castro', 'elena@salon.com', passwordHash, 'recepcionista'],
            ['Jorge Mendieta', 'jorge@salon.com', passwordHash, 'recepcionista']
        ];

        for (const u of usuarios) {
            await connection.query('INSERT IGNORE INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', u);
        }
        console.log('✅ Usuarios agregados.');

        // 2. Clientes (10 registros)
        const clientes = [
            ['Valentina Rosas', '555-0001', 'val.rosas@mail.com'],
            ['Andrés Hurtado', '555-0002', 'ahurtado@mail.com'],
            ['Camila Cabello', '555-0003', 'camila@mail.com'],
            ['Diego Forlán', '555-0004', 'diego@mail.com'],
            ['Elena Gómez', '555-0005', 'elena.g@mail.com'],
            ['Felipe Reyes', '555-0006', 'felipe@mail.com'],
            ['Gabriela Montes', '555-0007', 'gaby@mail.com'],
            ['Héctor Lavoe', '555-0008', 'hector@mail.com'],
            ['Inés Arrimadas', '555-0009', 'ines@mail.com'],
            ['Javier Solís', '555-0010', 'javier@mail.com']
        ];
        for (const c of clientes) {
            await connection.query('INSERT INTO clientes (nombre, telefono, email) VALUES (?, ?, ?)', c);
        }
        console.log('✅ Clientes agregados.');

        // 3. Servicios (10 registros)
        const servicios = [
            ['Corte de Cabello Mujer', 'Corte moderno con lavado', 25.00, 45],
            ['Corte de Cabello Hombre', 'Corte a máquina y tijera', 15.00, 30],
            ['Tinte Completo', 'Aplicación de tinte en todo el cabello', 60.00, 120],
            ['Mechas Balayage', 'Técnica de decoloración', 80.00, 180],
            ['Manicura Tradicional', 'Limpieza y esmalte tradicional', 12.00, 40],
            ['Pedicura Spa', 'Exfoliación, masaje y esmalte', 20.00, 60],
            ['Uñas Acrílicas', 'Set completo de acrílico', 35.00, 90],
            ['Maquillaje Profesional', 'Maquillaje de noche o evento', 50.00, 60],
            ['Peinado de Gala', 'Recogidos y semi-recogidos', 40.00, 60],
            ['Tratamiento Capilar', 'Hidratación profunda', 30.00, 45]
        ];
        for (const s of servicios) {
            await connection.query('INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos) VALUES (?, ?, ?, ?)', s);
        }
        console.log('✅ Servicios agregados.');

        // 4. Inventario / Productos (10 registros)
        const productos = [
            ['Shampoo Matizador 500ml', 'Neutraliza tonos amarillos', 15.00, 20],
            ['Acondicionador Hidratante', 'Para cabello seco', 14.00, 15],
            ['Mascarilla Reparadora', 'Tratamiento profundo semanal', 25.00, 10],
            ['Aceite de Argán', 'Sérum para puntas', 18.00, 30],
            ['Laca Fijación Fuerte', 'Para peinados', 10.00, 25],
            ['Tinte Castaño Claro', 'Tinte permanente', 8.50, 50],
            ['Esmalte Rojo Clásico', 'Esmalte tradicional', 5.00, 40],
            ['Decolorante Profesional', 'Polvo decolorante 500g', 22.00, 12],
            ['Cera Moldeadora', 'Fijación media para hombres', 11.00, 20],
            ['Protector Térmico', 'Spray para plancha y secadora', 16.00, 18]
        ];
        for (const p of productos) {
            await connection.query('INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)', p);
        }
        console.log('✅ Productos agregados.');

        // Para asociar Citas necesitamos IDs válidos
        const [usuariosDB] = await connection.query('SELECT id, rol FROM usuarios');
        const [clientesDB] = await connection.query('SELECT id FROM clientes');
        const [serviciosDB] = await connection.query('SELECT id, precio FROM servicios');

        const estilistas = usuariosDB.filter(u => u.rol === 'estilista');

        // 5. Citas (10 registros distribuidos en el mes actual)
        const citas = [];
        const estados = ['completada', 'completada', 'completada', 'completada', 'confirmada', 'confirmada', 'pendiente', 'pendiente', 'cancelada', 'cancelada'];

        for (let i = 0; i < 10; i++) {
            const cliente_id = clientesDB[i % clientesDB.length].id;
            const servicio_id = serviciosDB[i % serviciosDB.length].id;

            // Random estilista if existing, else first user
            const usuario_id = estilistas.length > 0
                ? estilistas[i % estilistas.length].id
                : usuariosDB[0].id;

            // Distribución de fechas recientes (últimos 30 días o próximos)
            let date = new Date();
            if (estados[i] === 'completada' || estados[i] === 'cancelada') {
                date.setDate(date.getDate() - Math.floor(Math.random() * 15)); // Past dates
            } else {
                date.setDate(date.getDate() + Math.floor(Math.random() * 10) + 1); // Future dates
            }

            const fechaHoraFormatoDb = date.toISOString().slice(0, 19).replace('T', ' ');

            citas.push([cliente_id, servicio_id, usuario_id, fechaHoraFormatoDb, estados[i]]);
        }

        for (const c of citas) {
            await connection.query('INSERT INTO citas (cliente_id, servicio_id, usuario_id, fecha_hora, estado) VALUES (?, ?, ?, ?, ?)', c);
        }
        console.log('✅ Citas agregadas.');

        // 6. Ventas (10 registros, ligados a las citas completadas)
        // Obtener las citas completadas
        const [citasCompletadas] = await connection.query('SELECT c.id, s.precio FROM citas c JOIN servicios s ON c.servicio_id = s.id WHERE c.estado = "completada"');

        // Add 10 sales. We have some from appointments, others standalone or dummy
        const ventas = [];
        const metodos = ['efectivo', 'tarjeta', 'transferencia', 'efectivo', 'tarjeta'];

        // Venta para citas completadas
        for (let i = 0; i < citasCompletadas.length; i++) {
            ventas.push([citasCompletadas[i].id, citasCompletadas[i].precio, metodos[i % metodos.length]]);
        }
        // Añadimos ventas extra independientes para llegar a 10
        const ventasExtra = 10 - ventas.length;
        for (let i = 0; i < ventasExtra; i++) {
            ventas.push([null, Math.floor(Math.random() * 50) + 15, metodos[i % metodos.length]]); // Standalone sales (e.g. products)
        }

        for (const v of ventas) {
            await connection.query('INSERT INTO ventas (cita_id, total, metodo_pago) VALUES (?, ?, ?)', v);
        }
        console.log('✅ Ventas agregadas.');

        // 7. Gastos (10 registros)
        const categoriasGastos = ['servicios', 'insumos', 'nomina', 'mantenimiento', 'otros'];
        const adminId = usuariosDB[0].id;
        const gastos = [
            ['Pago Alquiler Local', 'Alquiler mes actual', 500.00, categoriasGastos[3]],
            ['Recibo de Luz', 'Servicio eléctrico', 85.50, categoriasGastos[0]],
            ['Recibo de Agua', 'Servicio de agua', 35.00, categoriasGastos[0]],
            ['Compra Insumos L´Oreal', 'Tintes y shampoos', 320.00, categoriasGastos[1]],
            ['Pago Quincena Sofía', 'Recepción', 250.00, categoriasGastos[2]],
            ['Mantenimiento A/C', 'Limpieza filtros', 60.00, categoriasGastos[3]],
            ['Compra Café e Insumos', 'Snacks para clientes', 45.00, categoriasGastos[4]],
            ['Publicidad Facebook', 'Campaña mensual', 100.00, categoriasGastos[4]],
            ['Material de Limpieza', 'Cloro, escobas', 38.00, categoriasGastos[1]],
            ['Pago Internet', 'Servicio fibra óptica', 40.00, categoriasGastos[0]]
        ];

        for (const g of gastos) {
            // [concepto, descripcion, monto, categoria]
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 20)); // Fechas pasadas aleatorias
            const fechaFormato = d.toISOString().slice(0, 10);
            await connection.query('INSERT INTO gastos (concepto, descripcion, monto, fecha, categoria, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
                [g[0], g[1], g[2], fechaFormato, g[3], adminId]);
        }
        console.log('✅ Gastos agregados.');


        console.log('🎉 !Poblamiento de base de datos finalizado con éxito!');
        process.exit(0);
    } catch (error) {
        console.error('Error poblando la base de datos:', error);
        process.exit(1);
    }
}

seedDatabase();
