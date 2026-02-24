// src/components/phase2/ContentCard.jsx
// Professional topic card — no decorative icons, clean data-focused design.
import React from 'react';

const DIFFICULTY_LABEL = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

/**
 * ContentCard
 * @param {string}   topic          - topic id key
 * @param {string}   label          - human-readable topic name
 * @param {string}   description    - short description
 * @param {number}   difficulty     - 1 | 2 | 3
 * @param {string}   category       - "Foundations" | "Core Concepts" | "Advanced"
 * @param {string}   modality       - VARK modality string
 * @param {object}   difficultyMeta - { label, color }
 * @param {Function} onClick
 */
const ContentCard = ({
    topic, label, description, difficulty, category, modality, difficultyMeta, onClick,
}) => {
    return (
        <article
            className="cc-card"
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onClick()}
            aria-label={`Open ${label} learning capsule`}
        >
            {/* Difficulty accent line */}
            <div
                className="cc-accent"
                style={{ background: difficultyMeta?.color || '#7B61FF' }}
            />

            <div className="cc-body">
                {/* Meta row */}
                <div className="cc-meta">
                    <span className="cc-category">{category}</span>
                    <span
                        className="cc-difficulty"
                        style={{ color: difficultyMeta?.color, borderColor: difficultyMeta?.color + '44' }}
                    >
                        {DIFFICULTY_LABEL[difficulty]}
                    </span>
                </div>

                {/* Title */}
                <h2 className="cc-title">{label}</h2>

                {/* Description */}
                <p className="cc-description">{description}</p>

                {/* Footer */}
                <div className="cc-footer">
                    <span className="cc-modality-tag">{modality}</span>
                    <span className="cc-cta">Open Capsule</span>
                </div>
            </div>
        </article>
    );
};

export default ContentCard;
