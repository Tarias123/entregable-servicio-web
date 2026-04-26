import { useContext } from 'react';
import { ConfigContext } from '../context/ConfigContext';
import { FaBars, FaCrown } from 'react-icons/fa';

function Header({ toggleSidebar }) {
    const { config } = useContext(ConfigContext);

    const renderLogo = () => {
        const icon = <FaCrown className="text-[#a42ca1] mr-3" size={26} />;
        if (!config?.nombre_empresa) {
            return (
                <div className="flex items-center select-none">
                    {icon}
                    <span className="text-3xl font-serif font-bold text-gray-800 tracking-wide">Salon</span>
                    <span className="text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-[#a42ca1] tracking-wide ml-2">Admin</span>
                </div>
            );
        }
        const words = config.nombre_empresa.trim().split(' ');
        const mid = Math.ceil(words.length / 2);
        return (
            <div className="flex items-center select-none">
                {icon}
                <span className="text-3xl font-serif font-bold text-gray-800 tracking-wide mr-2">{words.slice(0, mid).join(' ')}</span>
                <span className="text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-[#a42ca1] tracking-wide">{words.slice(mid).join(' ')}</span>
            </div>
        );
    };

    return (
        <header className="flex justify-between items-center p-6 bg-white/50 backdrop-blur-md border-b border-gray-100 shadow-sm z-10 sticky top-0">
            <div className="flex items-center">
                <button onClick={toggleSidebar} className="md:hidden text-[#a42ca1] p-2 focus:outline-none mr-4 bg-white rounded-lg shadow-sm">
                    <FaBars size={22} />
                </button>
                <div className="hidden sm:flex items-center">{renderLogo()}</div>
            </div>
        </header>
    );
}

export default Header;
