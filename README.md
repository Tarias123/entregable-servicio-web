# Sistema de Gestion - Salon de Belleza

Aplicacion web para la gestion integral de un salon de belleza. Permite administrar clientes, citas, servicios, inventario, compras, ventas y reportes desde una interfaz moderna y responsiva.

## Tecnologias

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| Backend | Node.js + Express 5 |
| Base de datos | MySQL 8 |
| Imagenes | Cloudinary |
| Graficas | Chart.js |

## Estructura del proyecto

```
entregable-servicio-web/
├── backend/        # API REST con Express
│   ├── routes/     # Endpoints por modulo
│   ├── config/     # Configuracion Cloudinary
│   ├── db.js       # Conexion MySQL
│   └── server.js   # Entrada principal
└── frontend/       # Interfaz de usuario
    └── src/
        ├── pages/       # Vistas por modulo
        ├── components/  # Componentes reutilizables
        ├── context/     # Estado global
        └── services/    # Llamadas a la API
```

## Requisitos previos

- Node.js >= 18
- MySQL 8
- Cuenta en Cloudinary (para subida de imagenes)

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://github.com/Tarias123/entregable-servicio-web.git
cd entregable-servicio-web
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

Crear el archivo `.env` basado en `.env.example`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=salon_db
PORT=5000
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

Iniciar el servidor:

```bash
node server.js
```

### 3. Configurar el Frontend

```bash
cd ../frontend
npm install
npm run dev
```

La aplicacion estara disponible en `http://localhost:5175`

## Modulos

- **Clientes** — Registro y gestion de clientes
- **Servicios** — Catalogo de servicios con imagen referencial
- **Citas** — Programacion y seguimiento de citas
- **Ventas** — Registro de ventas por servicio
- **Productos** — Inventario de productos
- **Proveedores** — Gestion de proveedores
- **Compras** — Registro de compras con almacenamiento en almacenes
- **Almacenes** — Control de stock por almacen
- **Kardex** — Historial de movimientos de inventario
- **Gastos** — Control de egresos del negocio
- **Boletas** — Historial de comprobantes
- **Reportes** — Estadisticas de desempeno y ventas
- **Configuracion** — Datos de la empresa y ajustes del sistema
