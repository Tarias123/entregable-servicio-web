import api from './api';

const planesUrl = '/suscripciones/planes';
const clientesUrl = '/suscripciones/clientes';

// --- PLANES ---
export const getPlanes = async () => {
    const response = await api.get(planesUrl);
    return response.data;
};

export const createPlan = async (planData) => {
    const response = await api.post(planesUrl, planData);
    return response.data;
};

export const updatePlan = async (id, planData) => {
    const response = await api.put(`${planesUrl}/${id}`, planData);
    return response.data;
};

export const deletePlan = async (id) => {
    const response = await api.delete(`${planesUrl}/${id}`);
    return response.data;
};

// --- SUSCRIPCIONES DE CLIENTES ---
export const getSuscripciones = async () => {
    const response = await api.get(clientesUrl);
    return response.data;
};

export const assignPlanToClient = async (assignmentData) => {
    const response = await api.post(clientesUrl, assignmentData);
    return response.data;
};

export const updateSuscripcionEstado = async (id, estado) => {
    const response = await api.put(`${clientesUrl}/${id}/estado`, { estado });
    return response.data;
};
