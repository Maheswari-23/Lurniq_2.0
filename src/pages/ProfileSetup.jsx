// src/pages/ProfileSetup.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProgressIndicator = ({ currentStep }) => {
  const styles = {
    progressIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '40px',
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: '#666',
      transition: 'all 0.4s ease',
    },
    stepActive: {
      color: '#667eea',
      fontWeight: '600',
    },
    stepNumber: {
      height: '40px',
      width: '40px',
      borderRadius: '50%',
      backgroundColor: 'white',
      border: '2px solid #ddd',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      marginBottom: '8px',
      transition: 'all 0.4s ease',
    },
    stepNumberActive: {
      background: '#667eea',
      color: 'white',
      borderColor: '#667eea',
    },
    stepLabel: {
      fontSize: '0.9rem',
    },
    progressLine: {
      flexGrow: 1,
      height: '2px',
      backgroundColor: '#ddd',
      margin: '0 16px',
      marginBottom: '24px',
    },
  };

  return (
    <div style={styles.progressIndicator}>
      <div style={{...styles.step, ...(currentStep >= 1 ? styles.stepActive : {})}}>
        <div style={{...styles.stepNumber, ...(currentStep >= 1 ? styles.stepNumberActive : {})}}>1</div>
        <div style={styles.stepLabel}>Personal Info</div>
      </div>
      <div style={styles.progressLine}></div>
      <div style={{...styles.step, ...(currentStep >= 2 ? styles.stepActive : {})}}>
        <div style={{...styles.stepNumber, ...(currentStep >= 2 ? styles.stepNumberActive : {})}}>2</div>
        <div style={styles.stepLabel}>Education</div>
      </div>
      <div style={styles.progressLine}></div>
      <div style={{...styles.step, ...(currentStep >= 3 ? styles.stepActive : {})}}>
        <div style={{...styles.stepNumber, ...(currentStep >= 3 ? styles.stepNumberActive : {})}}>3</div>
        <div style={styles.stepLabel}>Preferences</div>
      </div>
    </div>
  );
};

const ProfileSetup = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);
  
  const finishSetup = () => {
    // Logic to save all profile data
    navigate('/signin'); // Or any other final destination
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    card: {
      background: 'white',
      borderRadius: '24px',
      padding: '40px',
      width: '100%',
      maxWidth: '800px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
    },
    heading: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#333',
    },
    subtitle: {
      color: '#666',
      marginBottom: '32px',
      fontSize: '14px',
    },
    formContent: {
      textAlign: 'left',
    },
    formHeading: {
      fontSize: '1.5rem',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e0e0e0',
      color: '#333',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '12px 15px',
      fontSize: '14px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box',
      backgroundColor: 'white',
      cursor: 'pointer',
    },
    formNavigation: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '40px',
      paddingTop: '24px',
      borderTop: '1px solid #e0e0e0',
    },
    navButton: {
      padding: '12px 32px',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '1rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    prevButton: {
      backgroundColor: 'white',
      color: '#666',
      border: '1px solid #ddd',
    },
    nextButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#667eea';
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#ddd';
  };

  const handlePrevHover = (e, isHovering) => {
    if (isHovering) {
      e.target.style.backgroundColor = '#f5f5f5';
    } else {
      e.target.style.backgroundColor = 'white';
    }
  };

  const handleNextHover = (e, isHovering) => {
    if (isHovering) {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
    } else {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = 'none';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Complete Your Profile</h1>
        <p style={styles.subtitle}>This information helps us personalize your learning experience.</p>
        <ProgressIndicator currentStep={step} />

        <div style={styles.formContent}>
          {step === 1 && (
            <form>
              <h2 style={styles.formHeading}>👤 Basic Information</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Jane" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Doe" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date of Birth</label>
                  <input 
                    type="date" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <form>
              <h2 style={styles.formHeading}>🎓 Education & Institution</h2>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Education Level</label>
                  <select 
                    style={styles.select}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  >
                    <option>School</option>
                    <option>College</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Institution / University Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., State University" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Major / Stream</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Computer Science" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Graduation Year</label>
                  <input 
                    type="number" 
                    placeholder="e.g., 2026" 
                    style={styles.input}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <form>
              <h2 style={styles.formHeading}>📚 Learning Preferences</h2>
              <div style={styles.formGroup}>
                <label style={styles.label}>Preferred Subjects or Areas of Interest</label>
                <input 
                  type="text" 
                  placeholder="e.g., Math, Science, Web Development" 
                  style={styles.input}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Learning Goals</label>
                <select 
                  style={styles.select}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option>Career Preparation</option>
                  <option>Exam Preparation</option>
                  <option>Upskilling</option>
                  <option>Hobby Learning</option>
                </select>
              </div>
            </form>
          )}

          <div style={styles.formNavigation}>
            {step > 1 && (
              <button 
                onClick={prevStep} 
                style={{...styles.navButton, ...styles.prevButton}}
                onMouseEnter={(e) => handlePrevHover(e, true)}
                onMouseLeave={(e) => handlePrevHover(e, false)}
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button 
                onClick={nextStep} 
                style={{...styles.navButton, ...styles.nextButton, marginLeft: step === 1 ? 'auto' : '0'}}
                onMouseEnter={(e) => handleNextHover(e, true)}
                onMouseLeave={(e) => handleNextHover(e, false)}
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={finishSetup} 
                style={{...styles.navButton, ...styles.nextButton}}
                onMouseEnter={(e) => handleNextHover(e, true)}
                onMouseLeave={(e) => handleNextHover(e, false)}
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;