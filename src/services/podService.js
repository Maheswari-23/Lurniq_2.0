import API_BASE_URL from '../config.js';

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('lurniq_token')}`
});

export const createPod = async (name, goals, weekly_challenge) => {
    const res = await fetch(`${API_BASE_URL}/pods/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, goals, weekly_challenge })
    });
    if (!res.ok) throw new Error((await res.json())?.error || "Error creating pod");
    return res.json();
};

export const joinPod = async (pod_code) => {
    const res = await fetch(`${API_BASE_URL}/pods/join`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pod_code })
    });
    if (!res.ok) throw new Error((await res.json())?.error || "Error joining pod");
    return res.json();
};

export const getMyPods = async () => {
    const res = await fetch(`${API_BASE_URL}/pods/my`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Error fetching pods");
    return res.json();
};

export const getPodDetails = async (pod_id) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Error fetching pod details");
    return res.json();
};

export const getChatHistory = async (pod_id) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/chat`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Error fetching chat");
    return res.json();
};

export const sendChatMessage = async (pod_id, message) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error("Error sending message");
    return res.json();
};

export const toggleTask = async (pod_id, task_id, completed) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/tasks`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ task_id, completed })
    });
    if (!res.ok) throw new Error("Error toggling task");
    return res.json();
};
