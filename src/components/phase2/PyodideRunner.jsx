import React, { useEffect, useState, useRef } from 'react';

const PyodideRunner = ({ initialCode, expectedOutput }) => {
    const [code, setCode] = useState(initialCode || '');
    const [output, setOutput] = useState('');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isCorrect, setIsCorrect] = useState(null);
    const pyodideRef = useRef(null);
    const outputRef = useRef('');

    // Sync input code when external initialCode changes (like clicking a different topic)
    useEffect(() => { setCode(initialCode || ''); }, [initialCode]);

    useEffect(() => {
        let mounted = true;
        const initPyodide = async () => {
            if (!window.loadPyodide) {
                if (mounted) setOutput("Pyodide script not loaded in index.html");
                return;
            }
            try {
                if (mounted) setOutput('Loading Python environment...\n');
                pyodideRef.current = await window.loadPyodide({
                    stdout: (msg) => {
                        outputRef.current += msg + '\n';
                        if (mounted) setOutput(prev => prev + msg + '\n');
                    },
                    stderr: (msg) => {
                        outputRef.current += 'Error: ' + msg + '\n';
                        if (mounted) setOutput(prev => prev + 'Error: ' + msg + '\n');
                    }
                });
                if (mounted) {
                    setIsLoaded(true);
                    setOutput(prev => prev + 'Environment ready. Write Python code and click Run.\n\n');
                }
            } catch (err) {
                if (mounted) setOutput('Failed to load Python environment: ' + err);
            }
        };

        if (!pyodideRef.current) initPyodide();
        return () => { mounted = false; };
    }, []);

    const handleRun = async () => {
        if (!pyodideRef.current || !isLoaded) return;
        setIsRunning(true);
        setIsCorrect(null);
        setOutput(prev => prev + '--- Running ---\n');
        outputRef.current = '';
        
        try {
            await pyodideRef.current.runPythonAsync(code);
            if (expectedOutput) {
                const cleanOutput = outputRef.current.trim();
                const cleanExpected = expectedOutput.trim();
                setIsCorrect(cleanOutput === cleanExpected);
            }
        } catch (err) {
            setOutput(prev => prev + err.message + '\n');
            if (expectedOutput) setIsCorrect(false);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="mc-pyodide-runner" style={{ margin: '15px 0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#282c34', padding: '12px' }}>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    disabled={!isLoaded || isRunning}
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        background: 'transparent',
                        color: '#ABB2BF',
                        fontFamily: '"Fira Code", monospace',
                        fontSize: '14px',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical',
                        lineHeight: '1.5'
                    }}
                    placeholder="# Write your Python code here..."
                />
            </div>
            
            <div style={{ display: 'flex', padding: '12px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                <button 
                    onClick={handleRun}
                    disabled={!isLoaded || isRunning}
                    style={{
                        padding: '8px 24px',
                        background: isLoaded ? '#10B981' : '#D1D5DB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isLoaded && !isRunning ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'background 0.2s'
                    }}
                >
                    {isRunning ? 'Running...' : '▶ Run Code'}
                </button>
                {!isLoaded && <span style={{ marginLeft: '12px', color: '#6B7280', fontSize: '13px', fontWeight: '500' }}>Starting Python container...</span>}
                </div>
                {isCorrect !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px', color: isCorrect ? '#059669' : '#DC2626' }}>
                        {isCorrect ? '✅ Output Matches Expected!' : '❌ Output Incorrect — Try Again'}
                    </div>
                )}
            </div>

            <div style={{ background: '#0D1117', color: '#10B981', padding: '12px', fontFamily: '"Fira Code", monospace', fontSize: '14px', minHeight: '100px', maxHeight: '250px', overflowY: 'auto' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output || 'Output will appear here...'}</pre>
            </div>
        </div>
    );
};

export default PyodideRunner;
