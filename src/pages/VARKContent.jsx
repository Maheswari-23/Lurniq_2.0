import React, { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useNavigate } from 'react-router-dom';
import '../styles/VARKContent.css';

// API Configuration
import API_BASE_URL from '../config.js';

// --- Helper Components for Drag-and-Drop ---
function DraggableLabel({ id, children, onDragStart }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: 10,
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="draggable-label"
      onMouseDown={() => onDragStart && onDragStart()}
    >
      {children}
    </div>
  );
}

function DroppableArea({ id, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="droppable-area">
      {children}
    </div>
  );
}

// --- Main VARK Content Component ---
const VARKContent = () => {
  const navigate = useNavigate();

  const [startTime] = useState(Date.now());
  const [firstInteraction, setFirstInteraction] = useState(null);
  const [interactionSequence, setInteractionSequence] = useState([]);

  // Enhanced engagement tracking
  const [engagement, setEngagement] = useState({
    visual: {
      clicks: 0,
      timeSpent: 0,
      videoPlays: 0,
      videoPauses: 0,
      videoTimeWatched: 0,
      videoCompletionPercent: 0,
      hoverTime: 0,
      revisits: 0
    },
    auditory: {
      clicks: 0,
      timeSpent: 0,
      audioPlays: 0,
      audioPauses: 0,
      audioTimeListened: 0,
      audioCompletionPercent: 0,
      seekEvents: 0,
      hoverTime: 0,
      revisits: 0
    },
    reading: {
      clicks: 0,
      timeSpent: 0,
      scrollDepth: 0,
      maxScrollDepth: 0,
      textSelections: 0,
      hoverTime: 0,
      revisits: 0
    },
    kinesthetic: {
      clicks: 0,
      timeSpent: 0,
      dragAttempts: 0,
      incorrectDrops: 0,
      correctDrops: 0,
      taskCompletionTime: 0,
      firstAttemptSuccess: null,
      resetClicks: 0,
      hoverTime: 0,
      revisits: 0
    },
  });

  const [activeType, setActiveType] = useState(null);

  // Refs for tracking
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const readingRef = useRef(null);
  const sectionStartTime = useRef(Date.now());
  const hoverTimers = useRef({});
  const kinestheticStartTime = useRef(null);
  const lastAudioTime = useRef(0);

  // Kinesthetic activity
  const [droppedItems, setDroppedItems] = useState({
    "evaporation": null,
    "condensation": null,
    "precipitation": null,
  });
  const [attemptCount, setAttemptCount] = useState(0);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  const labels = ["Sun heats water", "Vapour cools into clouds", "Water falls as rain"];
  const droppedLabels = Object.values(droppedItems).filter(Boolean);
  const availableLabels = labels.filter(
    (label) => !droppedLabels.includes(label)
  );

  // Load engagement data from memory on mount
  useEffect(() => {
    const savedEngagement = window.varkEngagement;
    if (savedEngagement) {
      setEngagement(savedEngagement);
      console.log('Loaded engagement data:', savedEngagement);
    }
  }, []);

  // Save engagement to memory whenever it changes
  useEffect(() => {
    window.varkEngagement = engagement;
  }, [engagement]);

  // Track interaction order
  const trackInteraction = (type) => {
    if (!firstInteraction) {
      setFirstInteraction(type);
    }
    setInteractionSequence(prev => [...prev, { type, timestamp: Date.now() }]);
  };

  // Track card hover time
  const handleMouseEnter = (type) => {
    hoverTimers.current[type] = Date.now();
  };

  const handleMouseLeave = (type) => {
    if (hoverTimers.current[type]) {
      const hoverDuration = Math.floor((Date.now() - hoverTimers.current[type]) / 1000);
      setEngagement(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          hoverTime: prev[type].hoverTime + hoverDuration
        }
      }));
      delete hoverTimers.current[type];
    }
  };

  // Navigation to questionnaire with enhanced engagement data
  const handleQuestionnaireClick = (learningStyle, event) => {
    event.stopPropagation();

    // Calculate final time for active section
    if (activeType) {
      const now = Date.now();
      const duration = Math.floor((now - sectionStartTime.current) / 1000);
      const finalEngagement = {
        ...engagement,
        [activeType]: {
          ...engagement[activeType],
          timeSpent: engagement[activeType].timeSpent + duration,
        },
      };

      // Save to memory before navigation
      window.varkEngagement = finalEngagement;
      window.varkMetadata = {
        firstInteraction,
        interactionSequence,
        totalSessionTime: Math.floor((Date.now() - startTime) / 1000)
      };

      console.log(`Navigating to questionnaire from ${learningStyle} learning style`);
      console.log('Final engagement data:', finalEngagement);
      console.log('Metadata:', window.varkMetadata);
    }

    navigate('/questionnaire');
  };

  // Tracking clicks and time with revisit detection
  const handleContentClick = (type) => {
    const now = Date.now();

    // Save time for previous active section
    if (activeType && activeType !== type) {
      const duration = Math.floor((now - sectionStartTime.current) / 1000);
      setEngagement((prev) => ({
        ...prev,
        [activeType]: {
          ...prev[activeType],
          timeSpent: prev[activeType].timeSpent + duration,
        },
      }));
    }

    // Track revisit (if returning to a previously clicked section)
    if (activeType && activeType !== type && engagement[type].clicks > 0) {
      setEngagement(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          revisits: prev[type].revisits + 1
        }
      }));
    }

    sectionStartTime.current = now;
    setActiveType(type);
    setEngagement((prev) => ({
      ...prev,
      [type]: { ...prev[type], clicks: prev[type].clicks + 1 },
    }));

    trackInteraction(type);
  };

  // Video tracking handlers
  const handleVideoPlay = () => {
    setEngagement(prev => ({
      ...prev,
      visual: { ...prev.visual, videoPlays: prev.visual.videoPlays + 1 }
    }));
  };

  const handleVideoPause = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      const completionPercent = Math.floor((currentTime / duration) * 100);

      setEngagement(prev => ({
        ...prev,
        visual: {
          ...prev.visual,
          videoPauses: prev.visual.videoPauses + 1,
          videoTimeWatched: Math.floor(currentTime),
          videoCompletionPercent: Math.max(prev.visual.videoCompletionPercent, completionPercent)
        }
      }));
    }
  };

  // Audio tracking handlers
  const handleAudioPlay = () => {
    setEngagement(prev => ({
      ...prev,
      auditory: { ...prev.auditory, audioPlays: prev.auditory.audioPlays + 1 }
    }));
  };

  const handleAudioPause = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const completionPercent = Math.floor((currentTime / duration) * 100);

      setEngagement(prev => ({
        ...prev,
        auditory: {
          ...prev.auditory,
          audioPauses: prev.auditory.audioPauses + 1,
          audioTimeListened: Math.floor(currentTime),
          audioCompletionPercent: Math.max(prev.auditory.audioCompletionPercent, completionPercent)
        }
      }));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;

      // Detect seeking (jumping backward/forward)
      if (Math.abs(currentTime - lastAudioTime.current) > 2) {
        setEngagement(prev => ({
          ...prev,
          auditory: { ...prev.auditory, seekEvents: prev.auditory.seekEvents + 1 }
        }));
      }

      lastAudioTime.current = currentTime;
    }
  };

  // Reading scroll tracking
  const handleReadingScroll = (e) => {
    const element = e.target;
    const scrollPercent = Math.floor((element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100);

    setEngagement(prev => ({
      ...prev,
      reading: {
        ...prev.reading,
        scrollDepth: scrollPercent,
        maxScrollDepth: Math.max(prev.reading.maxScrollDepth, scrollPercent)
      }
    }));
  };

  // Text selection tracking
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setEngagement(prev => ({
        ...prev,
        reading: { ...prev.reading, textSelections: prev.reading.textSelections + 1 }
      }));
    }
  };

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeType) {
        const now = Date.now();
        const duration = Math.floor((now - sectionStartTime.current) / 1000);
        const finalEngagement = {
          ...engagement,
          [activeType]: {
            ...engagement[activeType],
            timeSpent: engagement[activeType].timeSpent + duration,
          },
        };
        window.varkEngagement = finalEngagement;
        console.log("Final Engagement on unload:", finalEngagement);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeType, engagement]);

  // Kinesthetic drag start tracking
  const handleDragStart = () => {
    if (!kinestheticStartTime.current) {
      kinestheticStartTime.current = Date.now();
    }

    setEngagement(prev => ({
      ...prev,
      kinesthetic: { ...prev.kinesthetic, dragAttempts: prev.kinesthetic.dragAttempts + 1 }
    }));
  };

  // Handle drag and drop with enhanced tracking
  function handleDragEnd(event) {
    const { over, active } = event;

    if (over) {
      const isOccupied = Object.values(droppedItems).includes(active.id);
      if (isOccupied) return;

      const newDroppedItems = { ...droppedItems, [over.id]: active.id };
      setDroppedItems(newDroppedItems);
      setAttemptCount(prev => prev + 1);

      // Check if this drop is correct
      const correctAnswers = {
        "evaporation": "Sun heats water",
        "condensation": "Vapour cools into clouds",
        "precipitation": "Water falls as rain"
      };

      const isCorrectDrop = correctAnswers[over.id] === active.id;

      if (isCorrectDrop) {
        setEngagement(prev => ({
          ...prev,
          kinesthetic: { ...prev.kinesthetic, correctDrops: prev.kinesthetic.correctDrops + 1 }
        }));
      } else {
        setEngagement(prev => ({
          ...prev,
          kinesthetic: { ...prev.kinesthetic, incorrectDrops: prev.kinesthetic.incorrectDrops + 1 }
        }));
      }

      // Check if all slots are filled
      const allFilled = Object.values(newDroppedItems).every(val => val !== null);

      if (allFilled && !hasCompletedOnce) {
        const completionTime = Math.floor((Date.now() - kinestheticStartTime.current) / 1000);
        const isAllCorrect =
          newDroppedItems["evaporation"] === "Sun heats water" &&
          newDroppedItems["condensation"] === "Vapour cools into clouds" &&
          newDroppedItems["precipitation"] === "Water falls as rain";

        setEngagement(prev => ({
          ...prev,
          kinesthetic: {
            ...prev.kinesthetic,
            taskCompletionTime: completionTime,
            firstAttemptSuccess: attemptCount === 2 && isAllCorrect // 3 items = 3 attempts
          }
        }));

        setHasCompletedOnce(true);
      }
    }
  }

  // Reset button handler
  const handleReset = (event) => {
    event.stopPropagation();

    setDroppedItems({
      "evaporation": null,
      "condensation": null,
      "precipitation": null,
    });

    setEngagement(prev => ({
      ...prev,
      kinesthetic: { ...prev.kinesthetic, resetClicks: prev.kinesthetic.resetClicks + 1 }
    }));

    // Don't reset the start time or attempt count, keep tracking total attempts
  };

  return (
    <div className="vark-container">
      {/* ── Hero Header ── */}
      <div className="vark-header">
        <h1 className="gradient-text">VARK Learning Styles</h1>
        <p className="subtitle">Experience the Water Cycle through four unique learning modalities — and discover which one feels most <em>you</em>.</p>

        {/* Cold-start banner */}
        <div className="cold-start-banner">
          <div className="cold-start-icon">🔬</div>
          <div className="cold-start-text">
            <strong>We're silently calibrating your profile</strong>
            <p>
              Since this is your <span className="cold-start-badge">cold start</span>, our AI watches how you naturally engage — do you click videos, read articles, listen to audio, or drag things around?
              Just explore what feels natural. We'll use your behaviour to personalise your entire learning journey. No forms. No guessing. Pure intelligence. ✨
            </p>
          </div>
        </div>
      </div>

      {/* ── 4-column card grid ── */}
      <div className="vark-grid">

        {/* ── Visual ── */}
        <div
          className="learning-card visual-card animate-fade-in"
          onClick={() => handleContentClick("visual")}
          onMouseEnter={() => handleMouseEnter("visual")}
          onMouseLeave={() => handleMouseLeave("visual")}
        >
          <div className="card-accent" />
          <div className="card-inner">
            <div className="card-header">
              <h2>Visual Learning</h2>
              <span className="learning-badge">Watch &amp; See</span>
            </div>
            <p className="card-description">Understand concepts through diagrams, infographics, and dynamic video.</p>

            <div className="media-container">
              <iframe
                ref={videoRef}
                width="100%" height="240"
                src="https://www.youtube.com/embed/LkGvA0WZS5o?si=Fr2ziZ2rft0nX0hG&enablejsapi=1"
                title="Water Cycle Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="video-frame"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
              />
            </div>

            <div className="questionnaire-section">
              <button className="questionnaire-btn visual-btn" onClick={(e) => handleQuestionnaireClick('visual', e)}>
                Take Learning Assessment →
              </button>
            </div>

            <div className="card-footer">
              <p>Visual content helps you perceive and retain information through observation and spatial awareness.</p>
            </div>
          </div>
        </div>

        {/* ── Auditory ── */}
        <div
          className="learning-card auditory-card animate-fade-in"
          onClick={() => handleContentClick("auditory")}
          onMouseEnter={() => handleMouseEnter("auditory")}
          onMouseLeave={() => handleMouseLeave("auditory")}
        >
          <div className="card-accent" />
          <div className="card-inner">
            <div className="card-header">
              <h2>Auditory Learning</h2>
              <span className="learning-badge">Listen &amp; Learn</span>
            </div>
            <p className="card-description">Absorb information through podcasts, lectures, rhythms and discussion.</p>

            <div className="media-container">
              <audio
                ref={audioRef}
                controls
                className="audio-player"
                onPlay={handleAudioPlay}
                onPause={handleAudioPause}
                onTimeUpdate={handleAudioTimeUpdate}
              >
                <source src="/raindrops.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="audio-content">
              <h3>🌧️ The Sound of Precipitation</h3>
              <p>Listen carefully — each raindrop is evidence of the water cycle completing its loop. Precipitation is nature's way of returning water from atmosphere back to Earth.</p>
            </div>

            <div className="questionnaire-section">
              <button className="questionnaire-btn auditory-btn" onClick={(e) => handleQuestionnaireClick('auditory', e)}>
                Take Learning Assessment →
              </button>
            </div>

            <div className="card-footer">
              <p>Auditory learners retain information best through listening, rhythm, and verbal explanation.</p>
            </div>
          </div>
        </div>

        {/* ── Reading/Writing ── */}
        <div
          className="learning-card reading-card animate-fade-in"
          onClick={() => handleContentClick("reading")}
          onMouseEnter={() => handleMouseEnter("reading")}
          onMouseLeave={() => handleMouseLeave("reading")}
        >
          <div className="card-accent" />
          <div className="card-inner">
            <div className="card-header">
              <h2>Reading / Writing</h2>
              <span className="learning-badge">Read &amp; Write</span>
            </div>
            <p className="card-description">Process knowledge through detailed text, structured notes, and written explanation.</p>

            <div
              ref={readingRef}
              className="reading-content"
              onScroll={handleReadingScroll}
              onMouseUp={handleTextSelection}
              style={{ maxHeight: '380px', overflowY: 'auto' }}
            >
              <h3>What Is the Water Cycle?</h3>
              <p>The water cycle is the continuous movement of water through Earth's systems — driven by solar energy and gravity, it sustains all life.</p>

              <div className="step-section">
                <h4>Step 1 — Evaporation</h4>
                <p>Solar energy heats surface water, converting it into water vapour that rises into the atmosphere.</p>
              </div>
              <div className="step-section">
                <h4>Step 2 — Condensation</h4>
                <p>As vapour rises and cools, it condenses around tiny particles, forming clouds and fog.</p>
              </div>
              <div className="step-section">
                <h4>Step 3 — Precipitation</h4>
                <p>Water droplets merge, grow heavy, and fall as rain, snow, sleet, or hail, replenishing surface water stores.</p>
              </div>

              <div className="key-words">
                <h4>Key Terminology</h4>
                <div className="keyword-grid">
                  <div className="keyword-item"><strong>Evaporation:</strong> Liquid → water vapour via heat</div>
                  <div className="keyword-item"><strong>Condensation:</strong> Vapour → liquid droplets via cooling</div>
                  <div className="keyword-item"><strong>Precipitation:</strong> Atmospheric water → Earth's surface</div>
                </div>
              </div>

              <p className="conclusion">The water cycle is a closed system — the same water has been recycled for billions of years.</p>
            </div>

            <div className="questionnaire-section">
              <button className="questionnaire-btn reading-btn" onClick={(e) => handleQuestionnaireClick('reading', e)}>
                Take Learning Assessment →
              </button>
            </div>

            <div className="card-footer">
              <p>Text-based learners excel when they can annotate, summarise, and engage with written content.</p>
            </div>
          </div>
        </div>

        {/* ── Kinesthetic ── */}
        <DndContext onDragEnd={handleDragEnd}>
          <div
            className="learning-card kinesthetic-card animate-fade-in"
            onClick={() => handleContentClick("kinesthetic")}
            onMouseEnter={() => handleMouseEnter("kinesthetic")}
            onMouseLeave={() => handleMouseLeave("kinesthetic")}
          >
            <div className="card-accent" />
            <div className="card-inner">
              <div className="card-header">
                <h2>Kinesthetic Learning</h2>
                <span className="learning-badge">Touch &amp; Move</span>
              </div>
              <p className="card-description">
                Arrange the three stages of the water cycle in the correct sequence by dragging the labels into their slots.
              </p>

              <div className="kinesthetic-activity">
                {/* Per-slot instant feedback */}
                <div className="step-slots">
                  {[
                    { id: 'step-1', correct: 'Evaporation',   label: 'Step 1' },
                    { id: 'step-2', correct: 'Condensation',  label: 'Step 2' },
                    { id: 'step-3', correct: 'Precipitation', label: 'Step 3' },
                  ].map(({ id, correct, label }) => {
                    const dropped = droppedItems[id];
                    const isRight = dropped === correct;
                    const slotStyle = dropped
                      ? {
                          border: `2.5px solid ${isRight ? '#10B981' : '#EF4444'}`,
                          background: isRight ? '#F0FDF4' : '#FEF2F2',
                        }
                      : {};
                    return (
                      <DroppableArea key={id} id={id}>
                        {dropped ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'center', ...slotStyle, borderRadius: '10px', padding: '8px 16px' }}>
                            <span style={{ fontSize: '18px' }}>{isRight ? '✅' : '❌'}</span>
                            <span style={{ fontWeight: 700, color: isRight ? '#059669' : '#DC2626', fontSize: '15px' }}>{dropped}</span>
                            {!isRight && (
                              <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '4px' }}>
                                (should be <em>{correct}</em>)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="step-placeholder">{label} — drop here</span>
                        )}
                      </DroppableArea>
                    );
                  })}
                </div>

                {/* Draggable labels pool */}
                <div className="drag-labels-container">
                  {availableLabels.length > 0 ? (
                    availableLabels.map((label) => (
                      <DraggableLabel key={label} id={label} onDragStart={handleDragStart}>{label}</DraggableLabel>

                    ))
                  ) : (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      {droppedItems['evaporation'] === 'Sun heats water' &&
                       droppedItems['condensation'] === 'Vapour cools into clouds' &&
                       droppedItems['precipitation'] === 'Water falls as rain'
                        ? <p className="success-message" style={{ margin: 0, paddingBottom: '12px' }}>🎉 Perfect! All definitions are correct!</p>
                        : <div>
                            <p className="error-message" style={{ margin: '0 0 12px 0' }}>Some answers are missing or wrong.</p>
                            <button className="reset-btn" onClick={handleReset}>↺ Reset &amp; Try Again</button>
                          </div>
                      }
                    </div>
                  )}
                </div>

                {/* Full result banner — only when all slots filled */}
                {droppedItems['evaporation'] && droppedItems['condensation'] && droppedItems['precipitation'] && (
                  <div className="feedback-section" style={{ marginTop: '16px' }}>
                    {droppedItems['evaporation'] === 'Sun heats water' &&
                     droppedItems['condensation'] === 'Vapour cools into clouds' &&
                     droppedItems['precipitation'] === 'Water falls as rain'
                      ? <p className="correct-feedback" style={{ margin: 0 }}>✅ Excellent job! You understand the water cycle perfectly.</p>
                      : <p className="incorrect-feedback" style={{ margin: 0 }}>❌ Incorrect matches — try resetting the incorrect ones.</p>
                    }
                  </div>
                )}
              </div>


              <div className="questionnaire-section">
                <button className="questionnaire-btn kinesthetic-btn" onClick={(e) => handleQuestionnaireClick('kinesthetic', e)}>
                  Take Learning Assessment →
                </button>
              </div>

              <div className="card-footer">
                <p>Kinesthetic learners thrive through hands-on experimentation and physical engagement with content.</p>
              </div>
            </div>
          </div>
        </DndContext>

      </div>
    </div>
  );
};


export default VARKContent;
