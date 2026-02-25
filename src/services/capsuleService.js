// src/services/capsuleService.js
// Thin async wrapper around Phase 2 AIMC-Bandit backend endpoints.

import API_BASE_URL from '../config.js';

/**
 * Fetch a personalized micro-capsule for a given topic and VARK modality.
 * @param {string} topic      - e.g. "variables" | "loops"
 * @param {string} modality   - e.g. "Visual" | "Auditory" | "Reading" | "Kinesthetic"
 * @param {number} difficulty - difficulty level (default: 1)
 * @returns {Promise<object>} capsule response from backend
 */
export async function generateCapsule(topic, modality, difficulty = 1) {
    const response = await fetch(`${API_BASE_URL}/capsule/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, modality, difficulty }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Capsule generation failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Log a completed interaction and calculate the reward signal.
 * @param {object} params
 * @param {string}  params.topic
 * @param {string}  params.modality
 * @param {number}  params.time_spent      - seconds spent on content
 * @param {object}  params.quiz_results    - { correct: number, total: number }
 * @param {number}  params.satisfaction    - 0..1 (derived from quiz score)
 * @param {object}  params.vark_probs      - current VARK probability dict
 * @param {string}  params.session_id      - client-side session identifier
 * @returns {Promise<object>} reward signal and updated context vector
 */
export async function logInteraction({
    topic,
    modality,
    time_spent,
    quiz_results,
    satisfaction,
    vark_probs,
    session_id = 'default',
}) {
    const response = await fetch(`${API_BASE_URL}/capsule/interaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic,
            modality,
            time_spent,
            quiz_results,
            satisfaction,
            vark_probs,
            session_id,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Interaction logging failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Perform a Bayesian update of VARK probabilities using the computed reward.
 * @param {object} currentProbs - { Visual, Auditory, Reading, Kinesthetic }
 * @param {number} reward       - reward value from logInteraction
 * @param {string} modality     - the modality used in this interaction
 * @returns {Promise<object>} updated VARK probability dict
 */
export async function updateVarkProbabilities(currentProbs, reward, modality) {
    const response = await fetch(`${API_BASE_URL}/vark/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            current_probs: currentProbs,
            reward,
            modality,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `VARK update failed: ${response.status}`);
    }

    return response.json();
}
