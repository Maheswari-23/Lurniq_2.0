import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        primaryColor: '#7B61FF',
        primaryTextColor: '#fff',
        primaryBorderColor: '#7B61FF',
        lineColor: '#CBD5E1',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#e5e7eb'
    },
    securityLevel: 'loose',
});

const MermaidDiagram = ({ diagramCode }) => {
    const containerRef = useRef(null);
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const renderDiagram = async () => {
            if (!diagramCode) return;
            try {
                // Remove Markdown block wrapper if AI includes it
                let code = diagramCode.trim();
                // Mermaid specific markdown stripping
                code = code.replace(/^```mermaid/gmi, '');
                code = code.replace(/```$/gmi, '');
                code = code.trim();

                const id = `mermaid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const { svg } = await mermaid.render(id, code);
                
                if (isMounted) {
                    setSvgContent(svg);
                    setError('');
                }
            } catch (err) {
                console.error("Mermaid parsing error:", err);
                if (isMounted) {
                    setError('Unable to render diagram (syntax error).');
                }
            }
        };

        renderDiagram();
        return () => { isMounted = false; };
    }, [diagramCode]);

    if (error) {
        return <div className="mc-mermaid-error" style={{ color: '#EF4444', padding: '10px' }}>{error}</div>;
    }

    if (!svgContent) {
        return <div className="mc-mermaid-loading" style={{ padding: '20px', color: '#6B7280' }}>Loading visualization...</div>;
    }

    return (
        <div 
            ref={containerRef}
            className="mc-mermaid-container"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', overflowX: 'auto' }}
        />
    );
};

export default MermaidDiagram;
