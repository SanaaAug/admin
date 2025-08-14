

import React from 'react'
import { NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CNavItem,
  CNavLink,
  CSidebarToggler,
  CButtonGroup,
  CButton
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilEnvelopeOpen,
  cilList,
  cilMenu,
  cilAccountLogout,
  cilUser,
  cilClock,
  cilMoon,
  cilSun,
  cilContrast,
  cilSpeedometer,
  cilSettings
} from '@coreui/icons'
import { useColorModes } from '@coreui/react'

const AppHeader = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const admin = useSelector(state => state.admin)
  
  // Theme functionality
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  
  // Get current time
  const getCurrentTime = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19)
  }
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    dispatch({ type: 'logout' })
    navigate('/login')
  }

  return (
    <CHeader position="sticky" className="border-bottom">
      <CContainer fluid className="d-flex align-items-center">
        {/* Left side - Sidebar Toggle & Navigation */}
        <div className="d-flex align-items-center">
          <CSidebarToggler
            className="ps-1 me-3"
            onClick={() => dispatch({ type: 'set', sidebarShow: true })}
          />
          
          {/* Main Navigation Links */}
          <CHeaderNav className="d-none d-lg-flex">
            <CNavItem className="me-2">
              <CNavLink 
                to="/dashboard" 
                as={NavLink}
                className="d-flex align-items-center px-3 py-2 rounded"
                style={{
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
                activeStyle={{
                  backgroundColor: 'var(--cui-primary)',
                  color: 'white'
                }}
              >
                <CIcon icon={cilSpeedometer} className="me-2" />
                <span className="fw-medium">Dashboard</span>
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink 
                to="/admin" 
                as={NavLink}
                className="d-flex align-items-center px-3 py-2 rounded"
                style={{
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
                activeStyle={{
                  backgroundColor: 'var(--cui-primary)',
                  color: 'white'
                }}
              >
                <CIcon icon={cilSettings} className="me-2" />
                <span className="fw-medium">Admins</span>
              </CNavLink>
            </CNavItem>
          </CHeaderNav>
        </div>

        {/* Center - Current Time */}
        <div className="flex-grow-1 d-flex justify-content-center">
          <div className="d-flex align-items-center text-muted">
            <CIcon icon={cilClock} className="me-2" />
            <span className="small">
              <strong>{getCurrentTime()}</strong>
            </span>
          </div>
        </div>

        {/* Right side - Theme Toggle & User Menu */}
        <div className="d-flex align-items-center">
          {/* Mobile Navigation Dropdown */}
          <CDropdown className="d-lg-none me-2">
            <CDropdownToggle 
              color="light" 
              variant="outline" 
              size="sm"
              caret={false}
            >
              <CIcon icon={cilList} />
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownItem as={NavLink} to="/dashboard">
                <CIcon icon={cilSpeedometer} className="me-2" />
                Dashboard
              </CDropdownItem>
              <CDropdownItem as={NavLink} to="/admin">
                <CIcon icon={cilSettings} className="me-2" />
                Admins
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {/* Theme Toggle Buttons */}
          <div className="me-3">
            <CButtonGroup role="group" size="sm">
              <CButton
                color={colorMode === 'light' ? 'primary' : 'light'}
                variant={colorMode === 'light' ? 'solid' : 'outline'}
                onClick={() => setColorMode('light')}
                title="Light Mode"
                className="px-2"
              >
                <CIcon icon={cilSun} size="sm" />
              </CButton>
              <CButton
                color={colorMode === 'dark' ? 'primary' : 'light'}
                variant={colorMode === 'dark' ? 'solid' : 'outline'}
                onClick={() => setColorMode('dark')}
                title="Dark Mode"
                className="px-2"
              >
                <CIcon icon={cilMoon} size="sm" />
              </CButton>
              <CButton
                color={colorMode === 'auto' ? 'primary' : 'light'}
                variant={colorMode === 'auto' ? 'solid' : 'outline'}
                onClick={() => setColorMode('auto')}
                title="Auto Mode"
                className="px-2"
              >
                <CIcon icon={cilContrast} size="sm" />
              </CButton>
            </CButtonGroup>
          </div>

          {/* User Dropdown */}
          <CDropdown placement="bottom-end">
            <CDropdownToggle as={CNavLink} className="py-0 pe-0" caret={false}>
              <div 
                className="d-flex align-items-center px-3 py-2 rounded"
                style={{
                  border: '1px solid var(--cui-border-color)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <CIcon icon={cilUser} className="me-2" />
                <div className="d-flex flex-column align-items-start">
                  <span className="fw-medium small">
                    {admin?.username || 'unknown'}
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Administrator
                  </span>
                </div>
              </div>
            </CDropdownToggle>
            <CDropdownMenu className="pt-0" style={{ minWidth: '200px' }}>
              <CDropdownItem header className="text-center">
                {/* <div className="fw-bold">Account Menu</div> */}
                <small className="text-muted">{admin?.username || 'unknown'}</small>
              </CDropdownItem>
              {/* <CDropdownItem divider />
              <CDropdownItem>
                <CIcon icon={cilUser} className="me-2" />
                Profile Settings
              </CDropdownItem>
              <CDropdownItem>
                <CIcon icon={cilBell} className="me-2" />
                Notifications
                <span className="badge bg-danger ms-auto">3</span>
              </CDropdownItem>
              <CDropdownItem>
                <CIcon icon={cilSettings} className="me-2" />
                System Settings
              </CDropdownItem> */}
              <CDropdownItem divider />
              <CDropdownItem onClick={handleLogout} className="text-danger">
                <CIcon icon={cilAccountLogout} className="me-2" />
                <strong>Logout</strong>
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
        </div>
      </CContainer>

      <style jsx>{`
        .nav-link:hover {
          background-color: var(--cui-primary-bg-subtle) !important;
          color: var(--cui-primary) !important;
          transform: translateY(-1px);
        }
        
        .dropdown-toggle:hover div {
          background-color: var(--cui-primary-bg-subtle) !important;
          border-color: var(--cui-primary) !important;
        }
        
        @media (max-width: 991px) {
          .flex-grow-1 {
            flex-grow: 0 !important;
          }
        }
      `}</style>
    </CHeader>
  )
}

export default AppHeader