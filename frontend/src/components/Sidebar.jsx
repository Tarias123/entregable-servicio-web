import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaCog, FaUsers, FaCut, FaCalendarAlt, FaMoneyBillWave, FaBoxOpen, FaChartBar, FaWallet, FaReceipt, FaTruck, FaWarehouse, FaClipboardList, FaShoppingCart } from 'react-icons/fa';
import { ConfigContext } from '../context/ConfigContext';

function Sidebar({ isOpen, closeSidebar }) {
    const { config } = useContext(ConfigContext);

    const getInitials = (name) => {
        if (!name) return 'SB';
        const words = name.split(' ');
        if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const link = (to, Icon, label) => (
        <div className="flex flex-col items-center mb-6">
            <NavLink to={to} className={({ isActive }) => `flex items-center justify-center w-14 h-14 rounded-full transition-all ${isActive ? 'bg-white text-[#7d1b82] shadow-md' : 'hover:bg-white/20 text-white'}`}>
                <Icon size={22} />
            </NavLink>
            <span className="text-xs font-semibold mt-1 opacity-90">{label}</span>
        </div>
    );

    return (
        <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative w-32 flex flex-col items-center py-8 rounded-r-3xl m-0 shadow-lg h-full flex-shrink-0 transition-transform duration-300 ease-in-out`} style={{ background: 'linear-gradient(180deg, #a42ca1 0%, #31186b 100%)', zIndex: 50 }}>
            <div className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-10 overflow-hidden" style={{
                background: config?.logo_url ? `url(${config.logo_url}) no-repeat center center / cover` : 'linear-gradient(135deg, #d82e88 0%, #651b75 100%)',
            }}>
                {!config?.logo_url && (config?.nombre_empresa ? getInitials(config.nombre_empresa) : 'SB')}
            </div>

            <nav className="flex-1 w-full space-y-4 flex flex-col items-center text-white relative overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={() => { if (window.innerWidth < 768) closeSidebar(); }}>
                {link('/clientes',      FaUsers,         'Clientes')}
                {link('/proveedores',   FaTruck,         'Proveedores')}
                {link('/servicios',     FaCut,           'Servicios')}
                {link('/inventario',    FaBoxOpen,       'Productos')}
                {link('/almacenes',     FaWarehouse,     'Almacenes')}
                {link('/compras',       FaShoppingCart,  'Compras')}
                {link('/gastos',        FaWallet,        'Gastos')}
                {link('/kardex',        FaClipboardList, 'Kardex')}
                {link('/citas',         FaCalendarAlt,   'Citas')}
                {link('/ventas',        FaMoneyBillWave, 'Ventas')}
                {link('/boletas',       FaReceipt,       'Boletas')}
                {link('/reportes',      FaChartBar,      'Reportes')}
                {link('/configuracion', FaCog,           'Ajustes')}
            </nav>
        </aside>
    );
}

export default Sidebar;
