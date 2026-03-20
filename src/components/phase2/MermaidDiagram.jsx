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

const MermaidDiagram = ({ diagramCode, fallback }) => {
    const containerRef = useRef(null);
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const renderDiagram = async () => {
            if (!diagramCode) return;
            try {
                // 1. Initial cleanup
                let code = diagramCode.trim();
                
                // 2. Remove ANY markdown code block wrappers (AI sometimes nests them)
                code = code.replace(/```mermaid/gmi, '');
                code = code.replace(/```/gmi, '');
                
                // 3. Extract only the portion that looks like a mermaid diagram
                const mermaidMatch = code.match(/(graph\s+(?:TD|TB|LR|RL|BT)|sequenceDiagram|pie|gantt|classDiagram|stateDiagram|erDiagram|journey|gitGraph|mindmap|timeline)[\s\S]+/i);
                if (mermaidMatch) {
                    code = mermaidMatch[0];
                }

                // 4. Heuristic: Wrap unquoted labels in double quotes to prevent syntax errors with special chars
                // Fixes: ID[Some Label] -> ID["Some Label"]
                code = code.replace(/([a-zA-Z0-9_-]+)\[([^"\]\n]+)\]/g, '$1["$2"]');
                // Fixes: ID(Some Label) -> ID("Some Label")
                code = code.replace(/([a-zA-Z0-9_-]+)\(([^" \)\n]+)\)/g, '$1("$2")');
                
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
        if (fallback) return fallback;
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
