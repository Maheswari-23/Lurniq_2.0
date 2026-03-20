import React, { useState } from 'react';
import { Loader2, Monitor, Download } from 'lucide-react';

const PodWhiteboard = ({ podCode }) => {
    const [loading, setLoading] = useState(true);

    return (
        <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Header Toolbar */}
            <div style={{ padding: '12px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: '#F3E8FF', padding: '6px', borderRadius: '8px' }}>
                        <Monitor size={18} color="#7B61FF" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Interactive Whiteboard</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Real-time drawing synced for all pod members</p>
                    </div>
                </div>
            </div>

            {/* Iframe Whiteboard Container */}
            <div style={{ flex: 1, position: 'relative' }}>
                {loading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 10 }}>
                        <Loader2 size={32} className="lucide-spin" color="#7B61FF" style={{ marginBottom: '16px' }} />
                        <span style={{ color: '#4B5563', fontWeight: 500 }}>Connecting to collaborative canvas...</span>
                    </div>
                )}
                
                {/* WBO (Web Whiteboard) is open-source and allows instant embeddable collaboration rooms based on URL paths */}
                <iframe 
                    src={`https://wbo.ophir.dev/boards/lurniq-pod-${podCode}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Real-time Pod Whiteboard"
                    onLoad={() => setLoading(false)}
                />
            </div>
        </div>
    );
};

export default PodWhiteboard;
