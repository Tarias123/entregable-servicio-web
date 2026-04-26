import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/configuracion/public');
            const data = response.data;
            if (data.logo_url) {
                data.logo_url = `http://localhost:5000${data.logo_url}`;
            }
            setConfig(data);
        } catch {
            setConfig({ nombre_empresa: 'Salon de Belleza', simbolo_moneda: 'S/', logo_url: null });
        } finally {
            setLoadingConfig(false);
        }
    };

    useEffect(() => { fetchConfig(); }, []);
    const refreshConfig = () => fetchConfig();

    return (
        <ConfigContext.Provider value={{ config, loadingConfig, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
