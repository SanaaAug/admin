// import React, { useState } from 'react'
// import {
//   CButton,
//   CCard,
//   CCardBody,
//   CCol,
//   CContainer,
//   CForm,
//   CFormInput,
//   CInputGroup,
//   CInputGroupText,
//   CRow,
// } from '@coreui/react'
// import CIcon from '@coreui/icons-react'
// import { cilLockLocked, cilUser } from '@coreui/icons'
// import axios from 'axios'
// import { useNavigate } from 'react-router-dom'

// const Register = () => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [repeatPassword, setRepeatPassword] = useState('');
//   const [role, setRole] = useState('admin');// maybe dropdown imp later
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     if (username.trim() === '' || password.trim() === '' || repeatPassword.trim() === '') {
//       alert('All fields are required');
//       return;
//     }
//     if (password !== repeatPassword) {
//       alert('Passwords do not match');
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await axios.post('http://localhost:5000/api/admin/register', {
//         username,
//         password,
//         role,
//       });
//       alert('Registration successful!');
//       navigate('/login');
//     } catch (err) {
//       console.error('Register failed:', err);
//       alert('Registration failed: ' + (err.response?.data?.error || err.message));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
//       <CContainer>
//         <CRow className="justify-content-center">
//           <CCol md={9} lg={7} xl={6}>
//             <CCard className="mx-4">
//               <CCardBody className="p-4">
//                 <CForm onSubmit={handleRegister}>
//                   <h1>Register</h1>
//                   <p className="text-body-secondary">Create your account</p>
//                   <CInputGroup className="mb-3">
//                     <CInputGroupText>
//                       <CIcon icon={cilUser} />
//                     </CInputGroupText>
//                     <CFormInput
//                       placeholder="Username"
//                       autoComplete="username"
//                       value={username}
//                       onChange={e => setUsername(e.target.value)}
//                     />
//                   </CInputGroup>
//                   <CInputGroup className="mb-3">
//                     <CInputGroupText>
//                       <CIcon icon={cilLockLocked} />
//                     </CInputGroupText>
//                     <CFormInput
//                       type="password"
//                       placeholder="Password"
//                       autoComplete="new-password"
//                       value={password}
//                       onChange={e => setPassword(e.target.value)}
//                     />
//                   </CInputGroup>
//                   <CInputGroup className="mb-4">
//                     <CInputGroupText>
//                       <CIcon icon={cilLockLocked} />
//                     </CInputGroupText>
//                     <CFormInput
//                       type="password"
//                       placeholder="Repeat password"
//                       autoComplete="new-password"
//                       value={repeatPassword}
//                       onChange={e => setRepeatPassword(e.target.value)}
//                     />
//                   </CInputGroup>
                  
//                   <div className="d-grid">
//                     <CButton color="success" type="submit" disabled={loading}>
//                       {loading ? 'Registering...' : 'Create Account'}
//                     </CButton>
//                   </div>
//                 </CForm>
//               </CCardBody>
//             </CCard>
//           </CCol>
//         </CRow>
//       </CContainer>
//     </div>
//   )
// }

// export default Register