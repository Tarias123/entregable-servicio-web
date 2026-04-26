import api from './api';

export const pagosService = {
    getPagosPorCita: async (citaId) => {
        const response = await api.get(`/pagos/cita/${citaId}`);
        return response.data;
    },

    registrarPago: async (data) => {
        const response = await api.post('/pagos', data);
        return response.data;
    },

    eliminarPago: async (pagoId) => {
        const response = await api.delete(`/pagos/${pagoId}`);
        return response.data;
    }
};
