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

export const addTask = async (pod_id, task) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/tasks/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ task })
    });
    if (!res.ok) throw new Error("Error adding task");
    return res.json();
};

export const editTask = async (pod_id, task_id, task) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/tasks/${task_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ task })
    });
    if (!res.ok) throw new Error("Error editing task");
    return res.json();
};

export const deleteTask = async (pod_id, task_id) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/tasks/${task_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Error deleting task");
    return res.json();
};

export const updateGoals = async (pod_id, goals) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/goals`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ goals })
    });
    if (!res.ok) throw new Error("Error updating goals");
    return res.json();
};

export const updateNotes = async (pod_id, notes) => {
    const res = await fetch(`${API_BASE_URL}/pods/${pod_id}/notes`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error("Error updating notes");
    return res.json();
};
