import React, { useState, useRef } from 'react';
import { Bot, Search, Loader2, Sparkles, SlidersHorizontal, Eye, Headphones, BookOpen, Activity, ArrowRight, Plus, Link as LinkIcon, FileText } from 'lucide-react';
import MicroCapsule from '../components/phase2/MicroCapsule';
import API_BASE_URL from '../config.js';

const COMPONENT_VARKS = [
    { id: 'Visual', icon: Eye, label: 'Watch It', color: '#7B61FF' },
    { id: 'Auditory', icon: Headphones, label: 'Hear It', color: '#F97AFE' },
    { id: 'Reading', icon: BookOpen, label: 'Read It', color: '#4C1D95' },
    { id: 'Kinesthetic', icon: Activity, label: 'Do It', color: '#10B981' }
];

const COMPLEXITIES = [
    { id: 'layman', label: 'The Layman', sub: 'Analogy Mode', desc: 'No jargon, pure real-world analogies.' },
    { id: 'student', label: 'The Student', sub: 'Standard Mode', desc: 'Clear definitions and structured learning.' },
    { id: 'developer', label: 'The Developer', sub: 'Technical Mode', desc: 'Code-heavy, architecture & systems focus.' }
];

const ConceptLens = () => {
    const [topic, setTopic] = useState('');
    const [link, setLink] = useState('');
    const [file, setFile] = useState(null);
    const [complexity, setComplexity] = useState('student');
    const [activeTab, setActiveTab] = useState('Visual');
    const [loading, setLoading] = useState(false);
    const [lensData, setLensData] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!topic.trim() && !link.trim() && !file) return;
        
        setLoading(true);
        setError(null);
        setLensData(null);
        
        try {
            let body, headers = { 'Authorization': `Bearer ${localStorage.getItem('lurniq_token')}` };
            
            if (file) {
                body = new FormData();
                if (topic.trim()) body.append('topic', topic.trim());
                body.append('complexity', complexity);
                if (link.trim()) body.append('link', link.trim());
                body.append('file', file);
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({ topic: topic.trim(), complexity, link: link.trim() });
            }

            const res = await fetch(`${API_BASE_URL}/concept-lens`, {
                method: 'POST',
                headers,
                body
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error || "Failed to generate concept.");
            
            setLensData(result.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch automatically when complexity changes if we already have a topic
    const handleComplexityChange = (newComp) => {
        setComplexity(newComp);
        if (lensData && (topic || link || file)) {
            // Re-fire search with new complexity
            const form = document.getElementById('lens-form');
            if (form) setTimeout(() => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 50);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: "'Poppins', sans-serif" }}>
            
            {/* Header Hero */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F97AFE20, #7B61FF20)', padding: '12px', borderRadius: '50%', marginBottom: '16px' }}>
                    <Sparkles size={32} color="#7B61FF" />
                </div>
                <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 12px', background: 'linear-gradient(90deg, #F97AFE, #7B61FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Dynamic Concept Lens
                </h1>
                <p style={{ fontSize: '16px', color: '#4B5563', maxWidth: '600px', margin: '0 auto' }}>
                    Type any concept, choose your level of understanding, and instantly generate personalized analogies, diagrams, and interactive challenges.
                </p>
            </div>

            {/* Input & Controls */}
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '24px', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
                <form id="lens-form" onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: '1 1 300px' }}>
                            <Search size={20} color="#9CA3AF" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="Topic (e.g. APIs, Quantum Computing)..."
                                style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '16px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#7B61FF'}
                                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                            />
                        </div>
                        <div style={{ position: 'relative', flex: '1 1 300px' }}>
                            <LinkIcon size={20} color="#9CA3AF" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                placeholder="Or link a YouTube Video..."
                                style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '16px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#F97AFE'}
                                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FileText size={20} color={file ? '#7B61FF' : '#6B7280'} />
                            <span style={{ fontSize: '14px', color: file ? '#374151' : '#6B7280', fontWeight: file ? 600 : 400 }}>{file ? file.name : "Or upload a PDF document for context..."}</span>
                        </div>
                        <input type="file" id="lens-file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                        <label htmlFor="lens-file" style={{ padding: '8px 16px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#374151', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#C4B5FD'} onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
                            {file ? "Change File" : "Choose File"}
                        </label>
                    </div>

                    <button type="submit" disabled={loading || (!topic && !link && !file)} style={{ background: 'linear-gradient(135deg, #F97AFE, #7B61FF)', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: (loading || (!topic && !link && !file)) ? 'not-allowed' : 'pointer', opacity: (loading || (!topic && !link && !file)) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {loading ? <Loader2 size={20} className="lucide-spin" /> : <><Bot size={20} /> Focus Lens</>}
                    </button>
                </form>

                {/* Complexity Slider (Toggle Buttons) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontWeight: 600, fontSize: '14px' }}>
                        <SlidersHorizontal size={16} /> Choose Complexity Level:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {COMPLEXITIES.map(comp => {
                            const active = complexity === comp.id;
                            return (
                                <div 
                                    key={comp.id} 
                                    onClick={() => handleComplexityChange(comp.id)}
                                    style={{ 
                                        padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
                                        background: active ? '#F5F3FF' : '#F9FAFB', 
                                        border: `2px solid ${active ? '#7B61FF' : '#E5E7EB'}`,
                                        position: 'relative', overflow: 'hidden'
                                    }}
                                >
                                    {active && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#7B61FF' }} />}
                                    <div style={{ fontWeight: 800, color: active ? '#5B21B6' : '#111827', marginBottom: '4px' }}>{comp.label}</div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: active ? '#7B61FF' : '#6B7280', marginBottom: '6px' }}>{comp.sub}</div>
                                    <div style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: '1.4' }}>{comp.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontWeight: 500 }}>
                    Oops! Lens malfunction: {error}
                </div>
            )}

            {/* Result Area */}
            {lensData && !loading && (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }`}</style>
                    
                    {/* Explanation Context */}
                    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '24px', padding: '32px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bot size={24} color="#7B61FF" /> AI Explanation
                            </h2>
                            <button 
                                onClick={() => {
                                    if (window.__addCustomTopic) {
                                        window.__addCustomTopic({
                                            id: `custom_${Date.now()}`,
                                            label: topic,
                                            description: lensData.explanation.slice(0, 100) + '...',
                                            difficulty: 4,
                                            category: 'My Topics'
                                        });
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                                    background: '#F5F3FF', color: '#7B61FF', border: '1px solid #C4B5FD', 
                                    borderRadius: '99px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#EDE9FE'}
                                onMouseLeave={e => e.currentTarget.style.background = '#F5F3FF'}
                            >
                                <Plus size={16} /> Add to Learning Hub
                            </button>
                        </div>
                        <div style={{ color: '#374151', lineHeight: '1.8', fontSize: '16px' }}>
                            {lensData.explanation.split('\n').map((para, i) => (
                                <p key={i} style={{ marginBottom: i !== lensData.explanation.split('\n').length - 1 ? '16px' : 0 }}>{para}</p>
                            ))}
                        </div>
                    </div>

                    {/* VARK Specific Modality Interaction */}
                    <div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {COMPONENT_VARKS.map(vark => {
                                const active = activeTab === vark.id;
                                const Icon = vark.icon;
                                return (
                                    <button 
                                        key={vark.id}
                                        onClick={() => setActiveTab(vark.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '99px', border: 'none',
                                            fontWeight: 700, fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                                            background: active ? vark.color : '#F3F4F6',
                                            color: active ? 'white' : '#4B5563',
                                            boxShadow: active ? `0 4px 12px ${vark.color}40` : 'none'
                                        }}
                                    >
                                        <Icon size={18} /> {vark.label} ({vark.id})
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* MicroCapsule Renderer */}
                        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '24px', padding: '32px', minHeight: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <MicroCapsule 
                                modality={activeTab}
                                learning_objective={`Master ${topic} at '${complexity}' level.`}
                                analogy={lensData.explanation.slice(0, 150) + '...'}
                                content={lensData.vark[activeTab]} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConceptLens;
