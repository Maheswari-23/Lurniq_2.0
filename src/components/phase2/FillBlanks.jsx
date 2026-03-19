import React, { useState } from 'react';

const FillBlanks = ({ text, blanks }) => {
    // text is a string with placeholders like "The ___ heated the water."
    // blanks is an array of correct answers in order: ["Sun", "evaporation"]
    
    // Split the text by "___"
    const parts = text.split('___');
    
    const [inputs, setInputs] = useState(Array(blanks.length).fill(''));
    const [checked, setChecked] = useState(false);

    const handleChange = (index, value) => {
        const newInputs = [...inputs];
        newInputs[index] = value;
        setInputs(newInputs);
        setChecked(false); // reset check when typing
    };

    const handleCheck = () => setChecked(true);
    
    const isAllFilled = inputs.every(i => i.trim() !== '');

    return (
        <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '16px', lineHeight: '2', color: '#334155', fontWeight: 500 }}>
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        {part}
                        {i < blanks.length && (
                            <input
                                type="text"
                                value={inputs[i]}
                                onChange={(e) => handleChange(i, e.target.value)}
                                style={{
                                    border: 'none',
                                    borderBottom: checked 
                                        ? `2px solid ${inputs[i].trim().toLowerCase() === blanks[i].toLowerCase() ? '#10B981' : '#EF4444'}` 
                                        : '2px solid #94A3B8',
                                    background: checked 
                                        ? (inputs[i].trim().toLowerCase() === blanks[i].toLowerCase() ? '#ECFDF5' : '#FEF2F2')
                                        : 'transparent',
                                    color: checked 
                                        ? (inputs[i].trim().toLowerCase() === blanks[i].toLowerCase() ? '#059669' : '#DC2626')
                                        : '#0F172A',
                                    padding: '4px 8px',
                                    margin: '0 6px',
                                    width: `${Math.max(10, blanks[i].length + 2)}ch`,
                                    textAlign: 'center',
                                    fontFamily: 'inherit',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'all 0.2s'
                                }}
                                placeholder="?"
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button 
                    onClick={handleCheck}
                    disabled={!isAllFilled}
                    style={{
                        background: isAllFilled ? 'linear-gradient(135deg, #10B981, #059669)' : '#CBD5E1',
                        color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px',
                        fontWeight: 700, cursor: isAllFilled ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s', boxShadow: isAllFilled ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                    }}
                >
                    Check Answers
                </button>

                {checked && (
                    <div style={{ fontWeight: 600 }}>
                        {inputs.every((v, i) => v.trim().toLowerCase() === blanks[i].toLowerCase()) ? (
                            <span style={{ color: '#059669' }}>🎉 Perfect! You filled all the blanks correctly.</span>
                        ) : (
                            <span style={{ color: '#DC2626' }}>❌ Some answers are incorrect. Try again!</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FillBlanks;
