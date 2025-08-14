import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

const PrivateRoute = ({ children }) => {
  const authenticated = useSelector(state => state.authenticated)
  const admin = useSelector(state => state.admin)
  const dispatch = useDispatch()
  const location = useLocation()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if user has valid token on app load
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      
      if (token && !authenticated) {
        // Token exists but redux state not set - restore from localStorage
        const savedAdmin = localStorage.getItem('admin')
        if (savedAdmin) {
          try {
            const adminData = JSON.parse(savedAdmin)
            dispatch({ 
              type: 'set', 
              authenticated: true, 
              admin: adminData 
            })
          } catch (error) {
            console.error('Error parsing saved admin data:', error)
            localStorage.removeItem('token')
            localStorage.removeItem('admin')
          }
        }
      }
      
      setChecking(false)
    }

    checkAuth()
  }, [authenticated, dispatch])

  // Show loading spinner while checking authentication
  if (checking) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <CSpinner color="primary" size="lg" />
      </div>
    )
  }

  // If not authenticated, redirect to login with return path
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default PrivateRoute