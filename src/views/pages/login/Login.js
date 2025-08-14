import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilLockLocked, 
  cilUser, 
  cilLayers
} from '@coreui/icons';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // // Get current time in UTC format matching server
  // const getCurrentTime = () => {
  //   const now = new Date();
  //   return now.toISOString().replace('T', ' ').substring(0, 19);
  // };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim() === '' || password.trim() === '') {
      setError('Username and password are required');
      return;
    }

    setLoading(true);

    try {
      // Updated to use admin server port 5001
      const res = await axios.post('http://localhost:5001/api/admin/login', {
        username: username.trim(),
        password: password.trim(),
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Login successful:', res.data);
      
      // Store authentication data
      const { token, admin, expiresAt } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('admin', JSON.stringify(admin));
      localStorage.setItem('tokenExpiresAt', expiresAt);
      
      // Update Redux store
      dispatch({ 
        type: 'set', 
        authenticated: true, 
        admin: admin,
        token: token 
      });
      
      // Setup axios default auth header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error('Login failed:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        errorMessage = 'Unable to connect to server. Please check if the admin server is running on port 5001.';
      } else if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.error || err.response.data?.message || 'Invalid credentials';
        
        if (err.response.status === 401) {
          errorMessage = 'Invalid username or password. Please check your credentials.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // Request was made but no response
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-vh-100 d-flex flex-row align-items-center position-relative"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Animated Background Elements */}
      <div className="position-absolute w-100 h-100 overflow-hidden" style={{ zIndex: 0 }}>
        <div 
          className="position-absolute rounded-circle"
          style={{
            top: '10%',
            right: '15%',
            width: '300px',
            height: '300px',
            background: 'rgba(100, 200, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            animation: 'float 8s ease-in-out infinite'
          }}
        />
        <div 
          className="position-absolute rounded-circle"
          style={{
            bottom: '20%',
            left: '10%',
            width: '200px',
            height: '200px',
            background: 'rgba(150, 100, 255, 0.08)',
            backdropFilter: 'blur(15px)',
            animation: 'float 12s ease-in-out infinite reverse'
          }}
        />
      </div>

      <CContainer className="position-relative" style={{ zIndex: 1 }}>
        <CRow className="justify-content-center">
          <CCol lg={5} md={6} sm={8}>
            <CCard 
              className="border-0 shadow-lg"
              style={{ 
                borderRadius: '20px',
                background: 'rgba(30, 30, 50, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(100, 200, 255, 0.2)',
              }}
            >
              <CCardBody className="p-5">
                {/* Header */}
                <div className="text-center mb-5">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center rounded-4 mb-4"
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      boxShadow: '0 15px 35px rgba(79, 172, 254, 0.4)',
                    }}
                  >
                    <CIcon icon={cilLayers} size="xl" className="text-white" />
                  </div>
                  <h1 
                    className="h2 fw-bold mb-2" 
                    style={{ color: '#e2e8f0' }}
                  >
                    Welcome Back
                  </h1>
                  <p 
                    className="mb-0 fw-medium"
                    style={{ color: '#94a3b8' }}
                  >
                    Employee Management System
                  </p>
                </div>
                {/* Error Alert */}
                {error && (
                  <CAlert 
                    color="danger" 
                    className="mb-4 border-0" 
                    dismissible 
                    onClose={() => setError('')}
                    style={{
                      borderRadius: '12px',
                      background: 'rgba(220, 53, 69, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(220, 53, 69, 0.3)'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <CIcon icon={cilLockLocked} className="me-2" style={{ color: '#dc3545' }} />
                      <span style={{ color: '#dc3545', fontWeight: '500' }}>{error}</span>
                    </div>
                  </CAlert>
                )}

                <CForm onSubmit={handleLogin}>
                  {/* Username */}
                  <div className="mb-4">
                    <label 
                      className="form-label fw-semibold mb-2" 
                      style={{ color: '#e2e8f0' }}
                    >
                      Username
                    </label>
                    <CInputGroup>
                      <CInputGroupText 
                        className="border-0"
                        style={{ 
                          background: 'rgba(79, 172, 254, 0.2)',
                          color: '#4facfe',
                          borderRadius: '12px 0 0 12px'
                        }}
                      >
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Enter your username (e.g., SanaaAug)"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        className="border-0"
                        style={{ 
                          fontSize: '1rem',
                          padding: '14px 16px',
                          backgroundColor: 'rgba(79, 172, 254, 0.1)',
                          borderRadius: '0 12px 12px 0',
                          color: '#e2e8f0'
                        }}
                      />
                    </CInputGroup>
                  </div>

                  {/* Password */}
                  <div className="mb-5">
                    <label 
                      className="form-label fw-semibold mb-2" 
                      style={{ color: '#e2e8f0' }}
                    >
                      Password
                    </label>
                    <CInputGroup>
                      <CInputGroupText 
                        className="border-0"
                        style={{ 
                          background: 'rgba(79, 172, 254, 0.2)',
                          color: '#4facfe',
                          borderRadius: '12px 0 0 12px'
                        }}
                      >
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="border-0"
                        style={{ 
                          fontSize: '1rem',
                          padding: '14px 16px',
                          backgroundColor: 'rgba(79, 172, 254, 0.1)',
                          borderRadius: '0 12px 12px 0',
                          color: '#e2e8f0'
                        }}
                      />
                    </CInputGroup>
                  </div>

                  {/* Login Button */}
                  <div className="d-grid mb-4">
                    <CButton 
                      type="submit" 
                      disabled={loading}
                      className="py-3 fw-semibold border-0"
                      style={{ 
                        background: loading 
                          ? 'rgba(79, 172, 254, 0.5)' 
                          : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        boxShadow: loading 
                          ? 'none' 
                          : '0 10px 25px rgba(79, 172, 254, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        letterSpacing: '0.5px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 15px 35px rgba(79, 172, 254, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 10px 25px rgba(79, 172, 254, 0.3)';
                        }
                      }}
                    >
                      {loading ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Connecting to Admin Server...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilUser} className="me-2" />
                          Sign In
                        </>
                      )}
                    </CButton>
                  </div>
                </CForm>

                {/* Footer Info */}
                <div className="text-center">
                  <small style={{ color: '#94a3b8' }}>
                    Secure admin access • Admin Server (Port 5001)
                  </small>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        {/* Footer */}
        <div className="text-center mt-4">
          <small 
            className="fw-medium"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            Employee Management System v2.0 • Admin Portal
          </small>
        </div>
      </CContainer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-20px) rotate(180deg); 
            opacity: 0.8;
          }
        }
        
        .form-control:focus {
          box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2) !important;
          background-color: rgba(79, 172, 254, 0.15) !important;
        }
        
        .input-group:focus-within .input-group-text {
          background: rgba(79, 172, 254, 0.25) !important;
          color: #4facfe !important;
        }

        @media (max-width: 768px) {
          .position-absolute.rounded-circle {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;