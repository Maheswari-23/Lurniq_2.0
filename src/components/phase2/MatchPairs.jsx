import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

const ORANGE = '#F97316';
const ORANGE_DARK = '#EA580C';

const DraggableItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                cursor: 'grab',
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: `0 4px 12px rgba(249,115,22,0.3)`,
                userSelect: 'none',
                // Even sizing — fixed width + min-height so all cards are the same
                width: '220px',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                lineHeight: '1.4',
            }}
            {...listeners}
            {...attributes}
        >
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
                minHeight: '52px',
                borderRadius: '8px',
                border: droppedItem
                    ? `2.5px solid ${isCorrect ? ORANGE : '#EF4444'}`
                    : isOver ? `2px dashed ${ORANGE}` : '2px dashed #CBD5E1',
                backgroundColor: droppedItem
                    ? (isCorrect ? '#FFF7ED' : '#FEF2F2')
                    : isOver ? '#FFF7ED' : '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', transition: 'all 0.2s',
            }}>
                {droppedItem ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{isCorrect ? '✅' : '❌'}</span>
                        <span style={{ fontWeight: 600, color: isCorrect ? ORANGE_DARK : '#DC2626' }}>{droppedItem}</span>
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

                {/* Draggable pool */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '16px',
                    background: '#FFF7ED',
                    borderRadius: '12px',
                    minHeight: '76px',
                    border: `2px dashed #FED7AA`,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    {activeOptions.length > 0 ? (
                        activeOptions.map(opt => <DraggableItem key={opt} id={opt}>{opt}</DraggableItem>)
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            {allCorrect ? (
                                <p style={{ color: ORANGE_DARK, fontWeight: 700, margin: 0 }}>🎉 Perfect! All pairs matched.</p>
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
