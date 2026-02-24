import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ClipboardCheck, Sparkles, Star, ArrowRight } from 'lucide-react';
import '../styles/LandingPage.css';
import Logo from '../assets/logo.png';
import HeroImage from '../assets/herosectionimg.png';

// Custom hook for observing elements to trigger animations
const useOnScreen = (options) => {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(ref.current);
      }
    }, options);

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref, options]);

  return [ref, isVisible];
};

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <header className="navbar">
      <div className="container navbar-content">
        <div className="nav-left">
          <a href="/" className="nav-brand">
            <img src={Logo} alt="Lurniq Logo" className="logo-image" />
          </a>
        </div>
        <nav className="nav-center">
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#vark-meaning">What is VARK?</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
          </ul>
        </nav>
        <div className="nav-right">
          <button className="btn btn-secondary" onClick={() => navigate('/signin')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            <span>Sign Up</span>
          </button>
        </div>
      </div>
    </header>
  );
};

const LandingPage = () => {
  const [activeAge, setActiveAge] = useState(0);

  const ageGroups = [
    { range: '5-10', title: 'Young Explorers', desc: 'Interactive games & colorful visuals', icon: '🎨' },
    { range: '11-15', title: 'Discovery Phase', desc: 'Engaging videos & hands-on projects', icon: '🚀' },
    { range: '16-20', title: 'Academic Focus', desc: 'Study strategies & exam preparation', icon: '🎓' },
    { range: '21-25', title: 'Career Ready', desc: 'Professional skills & real-world application', icon: '💼' }
  ];

  const testimonials = [
    { name: "Sarah Chen", role: "High School Student", text: "Lurniq helped me discover I'm a visual learner. My grades improved by 30%!", rating: 5, avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
    { name: "Mike Rodriguez", role: "Parent", text: "My daughter finally enjoys studying. The personalized approach made all the difference.", rating: 5, avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    { name: "Dr. Emily Watson", role: "Educator", text: "I use this with my students. The engagement metrics help me track their progress effectively.", rating: 5, avatar: "https://randomuser.me/api/portraits/women/44.jpg" }
  ];
  
  const varkStyles = [
    { icon: '👁', title: 'Visual Learners (V)', desc: 'Prefer diagrams, charts, and mind maps. Understand best through images and colors.', example: 'Study with flowcharts and diagrams.' },
    { icon: '🎧', title: 'Auditory Learners (A)', desc: 'Learn best by listening and speaking. Benefit from lectures, podcasts, and discussions.', example: 'Record notes and play them back.' },
    { icon: '📖', title: 'Reading/Writing (R)', desc: 'Love text-based input. Thrive with notes, reading textbooks, lists, and summaries.', example: 'Rewrite notes or make lists.' },
    { icon: '🏃', title: 'Kinesthetic Learners (K)', desc: 'Learn by doing, moving, and hands-on activities. Prefer experiments and practical tasks.', example: 'Science labs or building projects.' }
  ];

  const [heroRef, isHeroVisible] = useOnScreen({ threshold: 0.1 });
  const [ageRef, isAgeVisible] = useOnScreen({ threshold: 0.1 });
  const [varkRef, isVarkVisible] = useOnScreen({ threshold: 0.1 });
  const [howRef, isHowVisible] = useOnScreen({ threshold: 0.1 });
  const [testimonialsRef, isTestimonialsVisible] = useOnScreen({ threshold: 0.1 });

  return (
    <div className="vark-landing">
      <Navbar />

      <main>
        <section ref={heroRef} className={`hero-section ${isHeroVisible ? 'animate-fade-in' : ''}`}>
          <div className="container">
            <div className="hero-content">
              <div className="hero-text">
                <h1 className="hero-title">
                  Unlock Your Potential with Lurniq – 
                  <span className="gradient-text"> Explore, Learn, and Grow!</span>
                </h1>
                <p className="hero-description">
                  Discover your unique learning style and get access to customized content, interactive lessons, and expert guidance tailored just for you.
                </p>
                <div className="hero-buttons">
                  <button className="btn btn-primary">
                    <span>Get Started for Free</span>
                    <ArrowRight className="btn-icon" />
                  </button>
                </div>
              </div>
              <div className="hero-visual">
                <img src={HeroImage} alt="A student smiling and learning online" className="hero-image" />
              </div>
            </div>
          </div>
        </section>

        <section ref={ageRef} id="features" className={`age-groups-section ${isAgeVisible ? 'animate-fade-in' : ''}`}>
          <div className="container">
            <div className="section-header">
              <h2>Learning for <span className="gradient-text">Every Age</span></h2>
              <p>We provide customized content that grows and adapts with our learners at every stage.</p>
            </div>
            <div className="age-groups-grid">
              {ageGroups.map((group, index) => (
                <div key={index} className={`card-base ${activeAge === index ? 'active' : ''}`} onMouseEnter={() => setActiveAge(index)}>
                  <div className="age-group-card">
                    <div className="age-icon">{group.icon}</div>
                    <div className="age-range">{group.range} Years</div>
                    <h3 className="age-title">{group.title}</h3>
                    <p className="age-desc">{group.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section ref={varkRef} id="vark-meaning" className={`vark-meaning-section ${isVarkVisible ? 'animate-fade-in' : ''}`}>
          <div className="container">
            <div className="section-header">
              <h2>What Does <span className="gradient-text">VARK Mean?</span></h2>
              <p>VARK is a model that identifies four primary types of learners. Discover yours to learn smarter.</p>
            </div>
            <div className="vark-grid">
              {varkStyles.map((style, index) => (
                <div key={index} className="card-base">
                  <div className="vark-card">
                    <div className="vark-icon">{style.icon}</div>
                    <h3 className="vark-title">{style.title}</h3>
                    <p className="vark-desc">{style.desc}</p>
                    <div className="vark-example">
                      <strong>Example:</strong> {style.example}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={howRef} id="how-it-works" className={`how-it-works-section ${isHowVisible ? 'animate-fade-in' : ''}`}>
          <div className="container">
            <div className="section-header">
              <h2>Get Started in <span className="gradient-text">3 Easy Steps</span></h2>
              <p>Your journey to personalized learning is just a few clicks away.</p>
            </div>
            <div className="steps-flow">
              {[
                { title: 'Sign Up', desc: 'Create your free profile in seconds.', icon: UserPlus },
                { title: 'Take Assessment', desc: 'Complete our simple questionnaire to find your learning style.', icon: ClipboardCheck },
                { title: 'Get Personalized Content', desc: 'Start learning your way with content tailored just for you.', icon: Sparkles }
              ].map((item, index) => (
                <div key={index} className="step-item">
                  <div className="step-card">
                    <div className="step-icon-wrapper">
                      <div className="step-icon"><item.icon size={32} /></div>
                    </div>
                    <div className="step-details">
                      <div className="step-number">0{index + 1}</div>
                      <h3 className="step-title">{item.title}</h3>
                      <p className="step-desc">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={testimonialsRef} id="testimonials" className={`testimonials-section ${isTestimonialsVisible ? 'animate-fade-in' : ''}`}>
          <div className="container">
            <div className="section-header">
              <h2>What Our <span className="gradient-text">Learners Say</span></h2>
              <p>Real stories from students, parents, and educators who love our platform.</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="card-base double-border">
                  <div className="testimonial-card">
                    <div className="testimonial-stars">
                      {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="star filled" />)}
                    </div>
                    <p className="testimonial-text">"{testimonial.text}"</p>
                    <div className="testimonial-author">
                      <div className="author-avatar">
                        <img src={testimonial.avatar} alt={testimonial.name} />
                      </div>
                      <div className="author-info">
                        <div className="author-name">{testimonial.name}</div>
                        <div className="author-role">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <img src={Logo} alt="Lurniq Logo" className="logo-image footer-logo" />
              <p>Your journey to personalized education starts here.</p>
            </div>
            <div className="footer-links">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#vark-meaning">What is VARK?</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Contact</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Lurniq – All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;