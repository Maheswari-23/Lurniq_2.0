// src/components/phase2/MicroCapsule.jsx
// Renders VARK-specific learning content. No decorative emoji — typographic hierarchy only.
import React from 'react';

// ── VISUAL ───────────────────────────────────────────────────────────────────
const VisualContent = ({ content }) => {
    const { diagram = [], color_code = [], steps = [], analogy = '', learning_objective = '' } = content;
    return (
        <div className="mc-visual">
            <div className="mc-objective">
                <span className="mc-objective-label">Learning Goal</span>
                <p>{learning_objective}</p>
            </div>

            {analogy && (
                <div className="mc-analogy">
                    <p>{analogy}</p>
                </div>
            )}

            {diagram.length > 0 && (
                <div className="mc-diagram-wrap">
                    <h3 className="mc-section-title">Flow Diagram</h3>
                    <pre className="mc-ascii-diagram">{diagram.join('\n')}</pre>
                </div>
            )}

            {color_code.length > 0 && (
                <div className="mc-colorblock-wrap">
                    <h3 className="mc-section-title">Colour-Coded Breakdown</h3>
                    <div className="mc-colorblocks">
                        {color_code.map((block, i) => (
                            <div key={i} className="mc-colorblock" style={{ borderLeftColor: block.color }}>
                                <div className="mc-colorblock-header" style={{ color: block.color }}>
                                    <strong>{block.label}</strong>
                                    <span className="mc-type-badge">{block.type}</span>
                                </div>
                                <code className="mc-colorblock-code">{block.value}</code>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {steps.length > 0 && (
                <div>
                    <h3 className="mc-section-title">Step-by-Step</h3>
                    <ol className="mc-steps-list">
                        {steps.map((step, i) => (
                            <li key={i} className="mc-step-item">
                                <span className="mc-step-num">{i + 1}</span>
                                <span>{step.replace(/^\d+\.\s*/, '')}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

// ── AUDITORY ─────────────────────────────────────────────────────────────────
const AuditoryContent = ({ content }) => {
    const { narrative = [], mnemonic = '', analogy = '', analogy_spoken = '', learning_objective = '' } = content;
    return (
        <div className="mc-auditory">
            <div className="mc-objective">
                <span className="mc-objective-label">Learning Goal</span>
                <p>{learning_objective}</p>
            </div>

            {analogy && (
                <div className="mc-analogy mc-analogy--auditory">
                    <p>{analogy}</p>
                </div>
            )}

            {narrative.length > 0 && (
                <div className="mc-narrative-wrap">
                    <h3 className="mc-section-title">Listen Along</h3>
                    <div className="mc-bubbles">
                        {narrative.map((line, i) => (
                            <div key={i} className={`mc-bubble mc-bubble--${i % 2 === 0 ? 'left' : 'right'}`}>
                                <span className="mc-bubble-avatar">{i % 2 === 0 ? '▶' : '◆'}</span>
                                <p className="mc-bubble-text">{line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {mnemonic && (
                <div>
                    <h3 className="mc-section-title">Memory Anchor</h3>
                    <div className="mc-mnemonic-box">{mnemonic}</div>
                </div>
            )}

            {analogy_spoken && (
                <div className="mc-analogy mc-analogy--spoken">
                    <p><em>{analogy_spoken}</em></p>
                </div>
            )}
        </div>
    );
};

// ── READ / WRITE ──────────────────────────────────────────────────────────────
const ReadWriteContent = ({ content }) => {
    const { definition = '', syntax = '', notes = [], examples = [], key_terms = [], learning_objective = '' } = content;
    return (
        <div className="mc-readwrite">
            <div className="mc-objective">
                <span className="mc-objective-label">Learning Goal</span>
                <p>{learning_objective}</p>
            </div>

            {definition && (
                <div>
                    <h3 className="mc-section-title">Definition</h3>
                    <div className="mc-rw-definition"><p>{definition}</p></div>
                </div>
            )}

            {syntax && (
                <div>
                    <h3 className="mc-section-title">Syntax</h3>
                    <div className="mc-rw-syntax"><pre className="mc-syntax-code">{syntax}</pre></div>
                </div>
            )}

            {notes.length > 0 && (
                <div>
                    <h3 className="mc-section-title">Key Notes</h3>
                    <ul className="mc-note-list">
                        {notes.map((n, i) => <li key={i}>{n.replace(/^[•\-]\s*/, '')}</li>)}
                    </ul>
                </div>
            )}

            {examples.length > 0 && (
                <div>
                    <h3 className="mc-section-title">Examples</h3>
                    {examples.map((ex, i) => (
                        <div key={i} className="mc-example-row">
                            <pre className="mc-example-code">{ex.code}</pre>
                            <p className="mc-example-explain">{ex.explanation}</p>
                        </div>
                    ))}
                </div>
            )}

            {key_terms.length > 0 && (
                <div>
                    <h3 className="mc-section-title">Key Terms</h3>
                    <div className="mc-terms-grid">
                        {key_terms.map((kt, i) => (
                            <div key={i} className="mc-term-card">
                                <strong className="mc-term-name">{kt.term}</strong>
                                <p className="mc-term-def">{kt.definition}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── KINESTHETIC ───────────────────────────────────────────────────────────────
const KinestheticContent = ({ content }) => {
    const [userCode, setUserCode] = React.useState('');
    const [showHint, setShowHint] = React.useState(false);
    const [hintIndex, setHintIndex] = React.useState(0);
    const [showSolution, setShowSolution] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);

    const { challenge = {}, analogy = '', learning_objective = '' } = content;
    const { instruction = '', starter = '', solution = '', hints = [] } = challenge;

    React.useEffect(() => { setUserCode(starter || ''); }, [starter]);

    const handleCheck = () => {
        const norm = s => s.replace(/\s+/g, ' ').trim();
        setFeedback(norm(userCode) === norm(solution) ? 'correct' : 'incorrect');
    };

    const handleNextHint = () => {
        setShowHint(true);
        setHintIndex(p => Math.min(p + 1, hints.length - 1));
    };

    return (
        <div className="mc-kinesthetic">
            <div className="mc-objective">
                <span className="mc-objective-label">Learning Goal</span>
                <p>{learning_objective}</p>
            </div>

            {analogy && (
                <div className="mc-analogy mc-analogy--kinesthetic">
                    <p>{analogy}</p>
                </div>
            )}

            <div className="mc-challenge-box">
                <div className="mc-challenge-header">
                    <h3>Try It Yourself</h3>
                </div>
                <p className="mc-challenge-instruction">{instruction}</p>

                <textarea
                    className="mc-code-editor"
                    value={userCode}
                    onChange={e => { setUserCode(e.target.value); setFeedback(null); }}
                    spellCheck={false}
                    rows={Math.max((starter.match(/\n/g) || []).length + 2, 4)}
                    aria-label="Code editor"
                />

                <div className="mc-challenge-controls">
                    <button className="mc-btn mc-btn--check" onClick={handleCheck}>Check Answer</button>
                    {hints.length > 0 && (
                        <button className="mc-btn mc-btn--hint" onClick={handleNextHint}
                            disabled={showHint && hintIndex >= hints.length - 1}>
                            {showHint ? 'Next Hint' : 'Show Hint'}
                        </button>
                    )}
                    <button className="mc-btn mc-btn--reveal" onClick={() => setShowSolution(p => !p)}>
                        {showSolution ? 'Hide Solution' : 'View Solution'}
                    </button>
                </div>

                {showHint && hints[hintIndex] && (
                    <div className="mc-hint">
                        <strong>Hint {hintIndex + 1}/{hints.length}:</strong> {hints[hintIndex]}
                    </div>
                )}

                {feedback && (
                    <div className={`mc-kfeedback mc-kfeedback--${feedback}`}>
                        {feedback === 'correct' ? 'Correct — well done.' : 'Not quite — review the hint and try again.'}
                    </div>
                )}

                {showSolution && (
                    <div className="mc-solution-wrap">
                        <h4>Solution</h4>
                        <pre className="mc-solution-code">{solution}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Dispatcher ────────────────────────────────────────────────────────────────
const MicroCapsule = ({ topic, modality, content }) => {
    const map = {
        Visual: <VisualContent content={content} topic={topic} />,
        Auditory: <AuditoryContent content={content} />,
        Reading: <ReadWriteContent content={content} />,
        Kinesthetic: <KinestheticContent content={content} />,
    };
    return (
        <div className={`micro-capsule micro-capsule--${modality.toLowerCase()}`}>
            {map[modality] ?? <ReadWriteContent content={content} />}
        </div>
    );
};

export default MicroCapsule;
