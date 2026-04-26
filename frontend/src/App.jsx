import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ConfigProvider } from './context/ConfigContext';

import Clientes      from './pages/Clientes';
import Servicios     from './pages/Servicios';
import Citas         from './pages/Citas';
import Ventas        from './pages/Ventas';
import Inventario    from './pages/Inventario';
import Reportes      from './pages/Reportes';
import Gastos        from './pages/Gastos';
import Configuracion from './pages/Configuracion';
import Boletas       from './pages/Boletas';
import Proveedores   from './pages/Proveedores';
import Almacenes     from './pages/Almacenes';
import Kardex        from './pages/Kardex';
import Compras       from './pages/Compras';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ConfigProvider>
      <Router>
        <div className="flex h-screen bg-[#f3f4fa] overflow-hidden text-gray-800 font-sans relative">
          <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <div className="flex-1 flex flex-col overflow-y-auto w-full relative">
            <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <main className="flex-1 p-4 md:p-8 pt-4 z-10 w-full mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/clientes" replace />} />
                <Route path="/clientes"      element={<Clientes />} />
                <Route path="/servicios"     element={<Servicios />} />
                <Route path="/citas"         element={<Citas />} />
                <Route path="/ventas"        element={<Ventas />} />
                <Route path="/inventario"    element={<Inventario />} />
                <Route path="/reportes"      element={<Reportes />} />
                <Route path="/gastos"        element={<Gastos />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/boletas"       element={<Boletas />} />
                <Route path="/proveedores"   element={<Proveedores />} />
                <Route path="/almacenes"     element={<Almacenes />} />
                <Route path="/kardex"        element={<Kardex />} />
                <Route path="/compras"       element={<Compras />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
