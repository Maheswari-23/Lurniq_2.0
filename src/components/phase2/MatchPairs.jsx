import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

const DraggableItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;

    return (
        <div ref={setNodeRef} style={{ ...style, cursor: 'grab', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', userSelect: 'none' }} {...listeners} {...attributes}>
            {children}
        </div>
    );
};

const DroppableSlot = ({ id, children, droppedItem, isCorrect }) => {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div style={{ fontSize: '15px', color: '#374151', fontWeight: 600 }}>{children}</div>
            <div ref={setNodeRef} style={{
                minHeight: '48px',
                borderRadius: '8px',
                border: droppedItem ? `2.5px solid ${isCorrect ? '#10B981' : '#EF4444'}` : isOver ? '2px dashed #10B981' : '2px dashed #CBD5E1',
                backgroundColor: droppedItem ? (isCorrect ? '#F0FDF4' : '#FEF2F2') : isOver ? '#ECFDF5' : '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', transition: 'all 0.2s',
            }}>
                {droppedItem ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{isCorrect ? '✅' : '❌'}</span>
                        <span style={{ fontWeight: 600, color: isCorrect ? '#059669' : '#DC2626' }}>{droppedItem}</span>
                    </div>
                ) : (
                    <span style={{ color: '#94A3B8', fontSize: '14px' }}>Drop here</span>
                )}
            </div>
        </div>
    );
};

const MatchPairs = ({ pairs }) => {
    const [droppedItems, setDroppedItems] = useState({});
    
    // Shuffle right-side items for the draggable pool
    const [availableOptions] = useState(() => {
        const options = pairs.map(p => p.right);
        return options.sort(() => Math.random() - 0.5);
    });

    const activeOptions = availableOptions.filter(opt => !Object.values(droppedItems).includes(opt));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && over.id) {
            setDroppedItems(prev => ({ ...prev, [over.id]: active.id }));
        }
    };

    const handleReset = () => setDroppedItems({});

    const allFilled = Object.keys(droppedItems).length === pairs.length;
    const allCorrect = allFilled && pairs.every(p => droppedItems[p.id] === p.right);

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pairs.map((pair) => (
                        <DroppableSlot 
                            key={pair.id} 
                            id={pair.id} 
                            droppedItem={droppedItems[pair.id]} 
                            isCorrect={droppedItems[pair.id] === pair.right}
                        >
                            {pair.left}
                        </DroppableSlot>
                    ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '16px', background: '#F0FDF4', borderRadius: '12px', minHeight: '60px', border: '2px dashed #D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                    {activeOptions.length > 0 ? (
                        activeOptions.map(opt => <DraggableItem key={opt} id={opt}>{opt}</DraggableItem>)
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            {allCorrect ? (
                                <p style={{ color: '#059669', fontWeight: 700, margin: 0 }}>🎉 Perfect! All pairs matched.</p>
                            ) : (
                                <div>
                                    <p style={{ color: '#DC2626', fontWeight: 600, margin: '0 0 8px' }}>Some pairs are wrong — check the ❌ slots!</p>
                                    <button onClick={handleReset} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #FECACA', background: 'white', color: '#DC2626', cursor: 'pointer', fontWeight: 600 }}>↺ Reset</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DndContext>
    );
};

export default MatchPairs;
