import React, { useState, useEffect, useRef } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useNavigate } from 'react-router-dom';
import '../styles/VARKContent.css';

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

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
    "step-1": null,
    "step-2": null,
    "step-3": null,
  });
  const [attemptCount, setAttemptCount] = useState(0);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);

  const labels = ["Evaporation", "Condensation", "Precipitation"];
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
        "step-1": "Evaporation",
        "step-2": "Condensation",
        "step-3": "Precipitation"
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
          newDroppedItems["step-1"] === "Evaporation" &&
          newDroppedItems["step-2"] === "Condensation" &&
          newDroppedItems["step-3"] === "Precipitation";
        
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
      "step-1": null,
      "step-2": null,
      "step-3": null,
    });
    
    setEngagement(prev => ({
      ...prev,
      kinesthetic: { ...prev.kinesthetic, resetClicks: prev.kinesthetic.resetClicks + 1 }
    }));
    
    // Don't reset the start time or attempt count, keep tracking total attempts
  };

  return (
    <div className="vark-container">
      <div className="vark-header">
        <h1 className="gradient-text">VARK Learning Styles</h1>
        <p className="subtitle">Discover the Water Cycle through Different Learning Approaches</p>
      </div>

      <div className="vark-grid">
        {/* Visual Section */}
        <div
          className="learning-card visual-card animate-fade-in"
          onClick={() => handleContentClick("visual")}
          onMouseEnter={() => handleMouseEnter("visual")}
          onMouseLeave={() => handleMouseLeave("visual")}
        >
          <div className="card-header">
            <h2>📊 Visual Learning</h2>
            <span className="learning-badge">Watch & See</span>
          </div>
          <p className="card-description">Learn with diagrams, infographics, and videos.</p>
          
          <div className="media-container">
            <iframe
              ref={videoRef}
              width="100%"
              height="250"
              src="https://www.youtube.com/embed/LkGvA0WZS5o?si=Fr2ziZ2rft0nX0hG&enablejsapi=1"
              title="Water Cycle Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="video-frame"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
            ></iframe>
          </div>
          
          <div className="questionnaire-section">
            <button 
              className="questionnaire-btn visual-btn"
              onClick={(e) => handleQuestionnaireClick('visual', e)}
            >
              📋 Take Learning Assessment
            </button>
          </div>
          
          <div className="card-footer">
            <p>🎥 Interactive visual content helps you understand processes through observation</p>
          </div>
        </div>

        {/* Auditory Section */}
        <div
          className="learning-card auditory-card animate-fade-in"
          onClick={() => handleContentClick("auditory")}
          onMouseEnter={() => handleMouseEnter("auditory")}
          onMouseLeave={() => handleMouseLeave("auditory")}
        >
          <div className="card-header">
            <h2>🎵 Auditory Learning</h2>
            <span className="learning-badge">Listen & Learn</span>
          </div>
          <p className="card-description">Learn with podcasts, lectures, and discussions.</p>
          
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
            <h3>🌧️ Listen to Nature's Symphony</h3>
            <p>Experience the sounds of rain and learn about precipitation patterns through audio explanations and natural soundscapes.</p>
          </div>
          
          <div className="questionnaire-section">
            <button 
              className="questionnaire-btn auditory-btn"
              onClick={(e) => handleQuestionnaireClick('auditory', e)}
            >
              🎧 Take Learning Assessment
            </button>
          </div>
          
          <div className="card-footer">
            <p>🎧 Audio learning helps you retain information through listening and repetition</p>
          </div>
        </div>

        {/* Reading/Writing Section */}
        <div
          className="learning-card reading-card animate-fade-in"
          onClick={() => handleContentClick("reading")}
          onMouseEnter={() => handleMouseEnter("reading")}
          onMouseLeave={() => handleMouseLeave("reading")}
        >
          <div className="card-header">
            <h2>📚 Reading/Writing</h2>
            <span className="learning-badge">Read & Write</span>
          </div>
          <p className="card-description">Learn through detailed text, notes, and written explanations.</p>
          
          <div 
            ref={readingRef}
            className="reading-content"
            onScroll={handleReadingScroll}
            onMouseUp={handleTextSelection}
            style={{ maxHeight: '400px', overflowY: 'auto' }}
          >
            <h3>What Is the Water Cycle?</h3>
            <p>The water cycle is the continuous movement of water on Earth. The sun heats water bodies, turning water into vapor through evaporation.</p>

            <div className="step-section">
              <h4>Step 1: Evaporation</h4>
              <p>Sun heats water, turning it into vapor that rises into the air.</p>
            </div>

            <div className="step-section">
              <h4>Step 2: Condensation</h4>
              <p>Water vapor cools and forms tiny droplets, creating clouds.</p>
            </div>

            <div className="step-section">
              <h4>Step 3: Precipitation</h4>
              <p>Droplets grow heavy and fall as rain, snow, or hail.</p>
            </div>

            <div className="key-words">
              <h4>Key Terms</h4>
              <div className="keyword-grid">
                <div className="keyword-item">
                  <strong>Evaporation:</strong> Water turns into vapor
                </div>
                <div className="keyword-item">
                  <strong>Condensation:</strong> Vapor forms clouds
                </div>
                <div className="keyword-item">
                  <strong>Precipitation:</strong> Water falls as rain
                </div>
              </div>
            </div>

            <p className="conclusion">This cycle keeps our planet's water moving and supports all life.</p>
          </div>
          
          <div className="questionnaire-section">
            <button 
              className="questionnaire-btn reading-btn"
              onClick={(e) => handleQuestionnaireClick('reading', e)}
            >
              📝 Take Learning Assessment
            </button>
          </div>
          
          <div className="card-footer">
            <p>📖 Reading and writing helps you process and retain detailed information</p>
          </div>
        </div>

        {/* Kinesthetic Section */}
        <DndContext onDragEnd={handleDragEnd}>
          <div
            className="learning-card kinesthetic-card animate-fade-in"
            onClick={() => handleContentClick("kinesthetic")}
            onMouseEnter={() => handleMouseEnter("kinesthetic")}
            onMouseLeave={() => handleMouseLeave("kinesthetic")}
          >
            <div className="card-header">
              <h2>🤹 Kinesthetic Learning</h2>
              <span className="learning-badge">Touch & Move</span>
            </div>
            <p className="card-description">
              Drag and drop the steps of the water cycle into the correct order!
            </p>

            <div className="kinesthetic-activity">
              <div className="step-slots">
                <DroppableArea id="step-1">
                  {droppedItems["step-1"] ? (
                    <div className="dropped-item">{droppedItems["step-1"]}</div>
                  ) : (
                    <span className="step-placeholder">Step 1</span>
                  )}
                </DroppableArea>

                <DroppableArea id="step-2">
                  {droppedItems["step-2"] ? (
                    <div className="dropped-item">{droppedItems["step-2"]}</div>
                  ) : (
                    <span className="step-placeholder">Step 2</span>
                  )}
                </DroppableArea>

                <DroppableArea id="step-3">
                  {droppedItems["step-3"] ? (
                    <div className="dropped-item">{droppedItems["step-3"]}</div>
                  ) : (
                    <span className="step-placeholder">Step 3</span>
                  )}
                </DroppableArea>
              </div>

              <div className="drag-labels-container">
                {availableLabels.length > 0 ? (
                  availableLabels.map((label) => (
                    <DraggableLabel key={label} id={label} onDragStart={handleDragStart}>
                      {label}
                    </DraggableLabel>
                  ))
                ) : (
                  <div className="completion-feedback">
                    {droppedItems["step-1"] === "Evaporation" &&
                     droppedItems["step-2"] === "Condensation" &&
                     droppedItems["step-3"] === "Precipitation" ? (
                      <p className="success-message">🎉 Great Job! 🎉</p>
                    ) : (
                      <div>
                        <p className="error-message">❌ Not quite. Try again!</p>
                        <button 
                          className="reset-btn"
                          onClick={handleReset}
                        >
                          🔄 Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {droppedItems["step-1"] &&
                droppedItems["step-2"] &&
                droppedItems["step-3"] && (
                  <div className="feedback-section">
                    {droppedItems["step-1"] === "Evaporation" &&
                    droppedItems["step-2"] === "Condensation" &&
                    droppedItems["step-3"] === "Precipitation" ? (
                      <p className="correct-feedback">
                        ✅ Correct! That's the right order.
                      </p>
                    ) : (
                      <p className="incorrect-feedback">
                        ❌ Not quite. Click reset to try again!
                      </p>
                    )}
                  </div>
                )}
            </div>
            
            <div className="questionnaire-section">
              <button 
                className="questionnaire-btn kinesthetic-btn"
                onClick={(e) => handleQuestionnaireClick('kinesthetic', e)}
              >
                🎯 Take Learning Assessment
              </button>
            </div>
            
            <div className="card-footer">
              <p>🎯 Hands-on activities help you learn through movement and interaction</p>
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default VARKContent;