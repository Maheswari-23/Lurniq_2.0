import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Questionnaire.css';
import { useAuth } from '../context/AuthContext';


// API Configuration
import API_BASE_URL from '../config.js';

const Questionnaire = () => {
  const navigate = useNavigate();
  const { saveVark } = useAuth();

  const [currentStep, setCurrentStep] = useState('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [result, setResult] = useState({ style: '', description: '', confidence: 0, allScores: {} });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const questions = [
    "When studying for an exam, what method do you find most effective?",
    "When you need to remember a phone number or address, how do you do it?",
    "If you were to learn how to assemble a piece of furniture, what would you do?",
    "In a classroom setting, what type of teaching style helps you learn best?",
    "How do you prefer to express your ideas and thoughts?",
    "When learning a new language, what method works best for you?",
    "How do you prefer to organize your work or study materials?",
    "What kind of environment helps you focus the best when working or studying?",
    "When you need to remember a key point or quote from a book, how do you do it?",
    "How do you prefer to solve a problem?"
  ];

  const options = [
    ["Drawing diagrams or watching videos", "Listening to recordings or discussing the material", "Writing summaries or reading notes", "Using hands-on practice or engaging in physical activities"],
    ["I visualize the number", "I say it out loud", "I write it down or read it multiple times", "I repeat it while moving"],
    ["Look at the diagrams and pictures in the instruction manual", "Watch a video or listen to someone explain the process", "Read the step-by-step instructions", "Start putting it together right away and figure it out as you go"],
    ["Teachers who use visual aids like slides, charts, or videos", "Teachers who lecture and explain things out loud", "Teachers who provide detailed written notes and reading materials", "Teachers who include activities, experiments, or hands-on learning"],
    ["Through drawings, diagrams, or visual presentations", "Through speaking or discussions", "Through writing essays, reports, or detailed notes", "Through actions, demonstrations, or role-playing"],
    ["Using flashcards with pictures or watching videos", "Listening to the language through conversations or audio lessons", "Reading textbooks, articles, or writing out vocabulary", "Practicing speaking with gestures or engaging in interactive activities"],
    ["By color-coding, using visual organizers, or keeping visual reminders", "By discussing the organization with someone or explaining it out loud", "By making lists, writing out schedules, or taking detailed notes", "By arranging items physically or creating hands-on displays"],
    ["A space with visual inspiration, like posters or visual organizers", "A space where you can listen to music or discussions without distractions", "A quiet space where you can read or write without interruptions", "A space where you can move around, stand, or engage in physical activities"],
    ["I visualize the page in my mind or remember the picture associated with the point", "I repeat the quote out loud or discuss it with someone else", "I write it down in my notes or underline it in the book", "I remember the context by associating the quote with an action or physical movement I made while reading"],
    ["By visualizing the problem and solution in your head", "By talking through the problem with others or hearing different perspectives", "By writing out the problem and working through it step by step", "By trying different solutions through trial and error"]
  ];

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex.toString());
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      alert('Please select an answer before continuing.');
      return;
    }

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = parseInt(selectedAnswer);
    setUserAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(newAnswers[currentQuestion + 1]?.toString() || '');
    } else {
      handleSubmit(newAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1]?.toString() || '');
    }
  };

  const handleSubmit = async (answers) => {
    setIsLoading(true);
    setCurrentStep('result');
    setError(null);

    try {
      // Get engagement data from memory
      const engagement = window.varkEngagement || {
        visual: { clicks: 0, timeSpent: 0 },
        auditory: { clicks: 0, timeSpent: 0 },
        reading: { clicks: 0, timeSpent: 0 },
        kinesthetic: { clicks: 0, timeSpent: 0 }
      };

      console.log('Sending data to ML API...');
      console.log('Engagement:', engagement);
      console.log('Questionnaire:', answers);

      // Call ML API
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engagement: engagement,
          questionnaire: answers
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('Prediction received:', data);
        const resultData = {
          style: data.predicted_style,
          description: data.description,
          confidence: data.confidence,
          allScores: data.all_scores || {}
        };
        setResult(resultData);
        // Persist VARK result — saves to localStorage + MongoDB
        await saveVark({
          style: data.predicted_style,
          allScores: data.all_scores || {},
        });
        // Navigate to celebration screen
        navigate('/vark-result');
      } else {
        throw new Error(data.error || 'Prediction failed');
      }

    } catch (err) {
      console.error('Error getting prediction:', err);
      setError(err.message);

      // Fallback to client-side calculation if API fails
      console.log('Falling back to client-side prediction...');
      const { style: learningStyle, allScores: fallbackScores } = calculateLearningStyleClientSide(answers);
      const fallbackResult = {
        style: learningStyle,
        description: getStyleDescription(learningStyle),
        confidence: 0.85,
        allScores: fallbackScores,
      };
      setResult(fallbackResult);
      // Persist fallback to localStorage + DB
      await saveVark({ style: learningStyle, allScores: fallbackScores });
      // Navigate to celebration screen
      navigate('/vark-result');
    } finally {
      setIsLoading(false);
    }
  };


  // Fallback client-side calculation — returns { style, allScores } with proper 0-1 probabilities
  const calculateLearningStyleClientSide = (answers) => {
    const counts = { Visual: 0, Auditory: 0, Reading: 0, Kinesthetic: 0 };
    const styleMap = { 0: 'Visual', 1: 'Auditory', 2: 'Reading', 3: 'Kinesthetic' };
    answers.forEach(a => { const s = styleMap[a]; if (s) counts[s]++; });
    const total = answers.length || 1;
    const allScores = {
      Visual: parseFloat((counts.Visual / total).toFixed(3)),
      Auditory: parseFloat((counts.Auditory / total).toFixed(3)),
      Reading: parseFloat((counts.Reading / total).toFixed(3)),
      Kinesthetic: parseFloat((counts.Kinesthetic / total).toFixed(3)),
    };
    const dominant = Object.entries(allScores).reduce((b, [k, v]) => v > b[1] ? [k, v] : b, ['Visual', 0])[0];
    return { style: dominant, allScores };
  };


  const getStyleDescription = (style) => {
    const descriptions = {
      "Visual": "You learn best through visual aids such as diagrams, charts, videos, and spatial understanding. Visual learners often prefer to see information presented graphically and may think in pictures. To optimize your learning, use color-coding, mind maps, and visual cues when studying.",
      "Auditory": "You learn best through listening and verbal communication. Auditory learners benefit from discussions, lectures, and talking through concepts. To enhance your learning, consider reading aloud, participating in group discussions, and using voice recordings for review.",
      "Reading": "You learn best through written words and text-based input. Reading/writing learners excel when information is displayed as text and benefit from making lists, reading textbooks, and taking detailed notes. To maximize your learning, focus on text-based resources and writing summaries of information.",
      "Kinesthetic": "You learn best through physical activities and hands-on experiences. Kinesthetic learners need to touch, move, and do in order to understand concepts fully. To improve your learning, incorporate movement into study sessions, use hands-on experiments, and take frequent breaks for physical activity."
    };
    return descriptions[style] || "";
  };

  const handleRestart = () => {
    setCurrentStep('quiz');
    setCurrentQuestion(0);
    setUserAnswers([]);
    setSelectedAnswer('');
    setResult({ style: '', description: '', confidence: 0, allScores: {} });
    setIsLoading(false);
    setError(null);
    // Clear engagement and VARK result data for a fresh start
    window.varkEngagement = {
      visual: { clicks: 0, timeSpent: 0 },
      auditory: { clicks: 0, timeSpent: 0 },
      reading: { clicks: 0, timeSpent: 0 },
      kinesthetic: { clicks: 0, timeSpent: 0 },
    };
    window.varkResult = null;
  };

  const getProgress = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  const getStyleEmoji = (style) => {
    const emojis = {
      'Visual': '📊',
      'Auditory': '🎵',
      'Reading': '📚',
      'Kinesthetic': '🤹'
    };
    return emojis[style] || '✨';
  };

  return (
    <div className="questionnaire-container">
      <h1 className="main-title gradient-text">Find Your Learning Style</h1>

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress"
            style={{ width: currentStep === 'quiz' ? `${getProgress()}%` : '100%' }}
          ></div>
        </div>
      </div>

      {/* Quiz Step */}
      {currentStep === 'quiz' && (
        <div className="form-container quiz-card animate-fade-in">
          <div className="ray"></div>
          <div className="line topl"></div>
          <div className="line bottoml"></div>
          <div className="line leftl"></div>
          <div className="line rightl"></div>

          <div className="question-number">{currentQuestion + 1}</div>
          <div className="question-text">{questions[currentQuestion]}</div>

          <div className="options-container">
            {options[currentQuestion].map((option, index) => (
              <button
                key={index}
                className={`option ${selectedAnswer === index.toString() ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(index)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="button-group">
            <button
              className="prev-btn"
              onClick={handlePrevious}
              style={{ visibility: currentQuestion === 0 ? 'hidden' : 'visible' }}
            >
              Previous
            </button>
            <button
              className={currentQuestion === questions.length - 1 ? 'submit-btn' : 'next-btn'}
              onClick={handleNext}
            >
              {currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Result Step */}
      {currentStep === 'result' && (
        <div className="form-container result-card animate-fade-in">
          <div className="ray"></div>
          <div className="line topl"></div>
          <div className="line bottoml"></div>
          <div className="line leftl"></div>
          <div className="line rightl"></div>

          {error && (
            <div className="error-message" style={{
              background: '#fee',
              border: '1px solid #fcc',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              color: '#c33'
            }}>
              ⚠️ API Connection Issue: {error}
              <br />
              <small>Using fallback prediction method</small>
            </div>
          )}

          <div className="result-heading">Your Learning Style Result</div>

          {isLoading ? (
            <>
              <div className="loading"></div>
              <div className="result-style">Analyzing...</div>
              <div className="result-description">
                Processing your engagement patterns and questionnaire responses using our ML model...
              </div>
            </>
          ) : (
            <>
              <div className="result-style">
                {getStyleEmoji(result.style)} {result.style}
              </div>

              {result.confidence > 0 && (
                <div className="confidence-score" style={{
                  margin: '15px 0',
                  padding: '10px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <strong>Confidence Score:</strong> {(result.confidence * 100).toFixed(1)}%
                </div>
              )}

              {Object.keys(result.allScores).length > 0 && (
                <div className="all-scores" style={{
                  margin: '15px 0',
                  padding: '15px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <strong>Detailed Breakdown:</strong>
                  <div style={{ marginTop: '10px' }}>
                    {Object.entries(result.allScores).map(([style, score]) => (
                      <div key={style} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span>{getStyleEmoji(style)} {style}</span>
                          <span><strong>{(score * 100).toFixed(1)}%</strong></span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '6px',
                          background: '#e0e0e0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${score * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                            transition: 'width 0.5s ease'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-description">
                {result.description}
              </div>

              <div className="ml-badge" style={{
                margin: '15px 0',
                padding: '8px 15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                display: 'inline-block'
              }}>
                🤖 Predicted using Advanced ML Model
              </div>

              {/* Phase 2 CTA — navigate to personalized learning content */}
              {result.style && (
                <button
                  className="restart-btn"
                  onClick={() => navigate('/learning')}
                  style={{
                    marginTop: '12px',
                    background: 'linear-gradient(135deg, #7B61FF 0%, #F97AFE 100%)',
                  }}
                >
                  🚀 Start Learning →
                </button>
              )}
            </>
          )}

          <button className="restart-btn" onClick={handleRestart}>
            Take Quiz Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Questionnaire;