require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('API Salon de Belleza'));

const clientesRoutes      = require('./routes/clientes');
const serviciosRoutes     = require('./routes/servicios');
const citasRoutes         = require('./routes/citas');
const ventasRoutes        = require('./routes/ventas');
const inventarioRoutes    = require('./routes/inventario');
const reportesRoutes      = require('./routes/reportes');
const gastosRoutes        = require('./routes/gastos');
const configuracionRoutes = require('./routes/configuracion');
const pagosRoutes         = require('./routes/pagos');
const galeriaRoutes       = require('./routes/galeria');
const boletasRoutes       = require('./routes/boletas');
const proveedoresRoutes   = require('./routes/proveedores');
const almacenesRoutes     = require('./routes/almacenes');
const kardexRoutes        = require('./routes/kardex');
const comprasRoutes       = require('./routes/compras');

app.use('/api/clientes',      clientesRoutes);
app.use('/api/servicios',     serviciosRoutes);
app.use('/api/citas',         citasRoutes);
app.use('/api/ventas',        ventasRoutes);
app.use('/api/inventario',    inventarioRoutes);
app.use('/api/reportes',      reportesRoutes);
app.use('/api/gastos',        gastosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/pagos',         pagosRoutes);
app.use('/api/galeria',       galeriaRoutes);
app.use('/api/boletas',       boletasRoutes);
app.use('/api/proveedores',   proveedoresRoutes);
app.use('/api/almacenes',     almacenesRoutes);
app.use('/api/kardex',        kardexRoutes);
app.use('/api/compras',       comprasRoutes);

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
