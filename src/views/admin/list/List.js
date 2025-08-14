


import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CButton, CBadge, CSpinner, CAlert, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CForm, CFormInput, CFormSelect, CFormLabel,
  CInputGroup, CInputGroupText, CTooltip, CDropdown, CDropdownToggle,
  CDropdownMenu, CDropdownItem, CFormTextarea, CNav, CNavItem, CNavLink,
  CTabContent, CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilUser, cilUserPlus, cilPencil, cilTrash, cilSettings,
  cilShieldAlt, cilPeople, cilSearch, cilReload, cilOptions,
  cilBuilding, cilUserFollow
} from '@coreui/icons';

import { useSelector } from 'react-redux';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
var CURRENT_DATE_TIME = new Date().toISOString();

const ROLE_COLORS = {
  superadmin: 'danger',
  admin: 'primary',
  systemadmin: 'warning'
};

const STATUS_COLORS = {
  active: 'success',
  inactive: 'secondary',
  suspended: 'warning'
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  // Fallback to basic auth if no token
  return { Authorization: 'Basic YWRtaW46YWRtaW5fcGFzc3dvcmQ=' };
};

const List = () => {
  // Get current admin from Redux
  const currentAdmin = useSelector(state => state.admin) || {
    username: 'SanaaAug',
    role: 'systemadmin', // Changed to systemadmin to test
    id: 1,
    company_id: 'e1b21e25-0c31-4a1e-8d8e-f658597e7420'
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState('admins');

  // Data state
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    superadmins: 0,
    regularAdmins: 0,
    systemAdmins: 0,
    totalCompanies: 0
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [createModal, setCreateModal] = useState(false);
  const [createCompanyModal, setCreateCompanyModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [actionType, setActionType] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'admin',
    company_id: ''
  });

  // Company form state
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    registerNumber: '',
    email: '',
    tenant_id: '',
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
    adminFullName: '',
    adminRole: 'admin'
  });

  const [formErrors, setFormErrors] = useState({});
  const [companyFormErrors, setCompanyFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Log activity to admin server
  const logActivity = async (action, details) => {
    try {
      await axios.post(
        `${ADMIN_SERVER}/api/admin/activity`,
        {
          action,
          details,
          timestamp: new Date().toISOString(),
          user: currentAdmin?.username || 'unknown',
          company_id: currentAdmin?.company_id || null,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );
    } catch (error) {
      console.warn('Failed to log activity:', error.message);
      // Don't fail the main operation if logging fails
    }
  };

  // Filtered admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !search || 
      admin.username.toLowerCase().includes(search.toLowerCase()) ||
      (admin.email && admin.email.toLowerCase().includes(search.toLowerCase())) ||
      (admin.full_name && admin.full_name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesRole = !roleFilter || admin.role === roleFilter;
    const matchesStatus = !statusFilter || admin.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Load admins from admin server
  const loadAdmins = useCallback(async () => {
    try {
      setError('');

      const response = await axios.get(`${ADMIN_SERVER}/api/admin/users`, {
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        }
      });

      const adminData = response.data.admins || [];
      setAdmins(adminData);
      
      // Calculate stats
      const calculatedStats = {
        total: adminData.length,
        superadmins: adminData.filter(a => a.role === 'superadmin').length,
        regularAdmins: adminData.filter(a => a.role === 'admin').length,
        systemAdmins: adminData.filter(a => a.role === 'systemadmin').length,
        totalCompanies: companies.length
      };
      setStats(calculatedStats);

    } catch (err) {
      console.error('Error loading admins:', err);
      let errorMessage = 'Failed to load admin list from Admin Server';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        localStorage.removeItem('tokenExpiresAt');
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Only authorized users can view admin list.';
      } else {
        errorMessage = err.response?.data?.error || 
                     err.response?.data?.message || 
                     errorMessage;
      }
      
      setError(errorMessage);
      
      // Log failed data load
      logActivity('load_admins_failed', {
        error: errorMessage,
        success: false
      });
    }
  }, [currentAdmin.username, companies.length]);

  // Load companies from admin server (only for system admins)
  const loadCompanies = useCallback(async () => {
    if (currentAdmin.role !== 'systemadmin') return;

    try {
      const response = await axios.get(`${ADMIN_SERVER}/admin/companies`, {
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        }
      });

      const companyData = response.data.companies || [];
      console.log(companyData);
      setCompanies(companyData);

    } catch (err) {
      console.error('Error loading companies:', err);
      // Non-critical error for companies
    }
  }, [currentAdmin.role]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadAdmins(), loadCompanies()]);
      setLoading(false);
    };

    loadData();
  }, [loadAdmins, loadCompanies]);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Form handling
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCompanyFormChange = (field, value) => {
    setCompanyFormData(prev => ({ ...prev, [field]: value }));
    if (companyFormErrors[field]) {
      setCompanyFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
      errors.username = 'Username can only contain letters, numbers, dots, underscores, and hyphens';
    } else if (admins.some(admin => admin.username === formData.username.trim())) {
      errors.username = 'Username already exists';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.email && admins.some(admin => admin.email === formData.email.trim())) {
      errors.email = 'Email already exists';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCompanyForm = () => {
    const errors = {};

    if (!companyFormData.name.trim()) {
      errors.name = 'Company name is required';
    }

    if (!companyFormData.tenant_id.trim()) {
      errors.tenant_id = 'Tenant ID is required';
    }

    if (!companyFormData.adminUsername.trim()) {
      errors.adminUsername = 'Admin username is required';
    } else if (companyFormData.adminUsername.length < 3) {
      errors.adminUsername = 'Username must be at least 3 characters';
    }

    if (!companyFormData.adminPassword.trim()) {
      errors.adminPassword = 'Admin password is required';
    } else if (companyFormData.adminPassword.length < 6) {
      errors.adminPassword = 'Password must be at least 6 characters';
    }

    if (companyFormData.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyFormData.adminEmail)) {
      errors.adminEmail = 'Invalid email format';
    }

    setCompanyFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      role: 'admin',
      company_id: ''
    });
    setFormErrors({});
  };

  const resetCompanyForm = () => {
    setCompanyFormData({
      name: '',
      registerNumber: '',
      email: '',
      tenant_id: '',
      adminUsername: '',
      adminPassword: '',
      adminEmail: '',
      adminFullName: '',
      adminRole: 'admin'
    });
    setCompanyFormErrors({});
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${ADMIN_SERVER}/api/admin/users`,
        {
          username: formData.username.trim(),
          password: formData.password,
          email: formData.email.trim() || null,
          full_name: formData.full_name.trim() || null,
          role: formData.role,
          company_id: formData.company_id.trim() || null
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Log successful admin creation
      logActivity('create', {
        new_admin_username: formData.username.trim(),
        new_admin_role: formData.role,
        new_admin_email: formData.email.trim() || null,
        created_by: currentAdmin.username,
        success: true,
        response_data: response.data
      });

      setSuccess(`Admin ${formData.username} created successfully!`);
      setCreateModal(false);
      resetForm();
      await loadAdmins();

    } catch (err) {
      console.error('Error creating admin:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to create admin';
      setError(errorMessage);
      
      // Log failed admin creation
      logActivity('fail', {
        username_attempted: formData.username.trim(),
        role_attempted: formData.role,
        error: errorMessage,
        created_by: currentAdmin.username,
        success: false
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    
    if (!validateCompanyForm()) return;

    setSubmitting(true);
    let createdCompany = null; // Track created company for cleanup if needed
    
    try {
      // Create company first
      const companyResponse = await axios.post(
        `${ADMIN_SERVER}/api/admin/users/company`, // Fixed URL
        {
          tenant_id: companyFormData.tenant_id.trim(),
          created_by: currentAdmin.username,
          status: 1,
          objects: [
            {
              object_type: 'name',
              object_value: companyFormData.name.trim()
            },
            {
              object_type: 'registerNumber',
              object_value: companyFormData.registerNumber.trim()
            },
            {
              object_type: 'email',
              object_value: companyFormData.email.trim()
            }
          ]
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      const newCompany = companyResponse.data.company;
      createdCompany = newCompany; // Store for potential cleanup

      console.log('Company created successfully:', newCompany);

      // Create admin for the company
      const adminResponse = await axios.post(
        `${ADMIN_SERVER}/api/admin/users`,
        {
          username: companyFormData.adminUsername.trim(),
          password: companyFormData.adminPassword,
          email: companyFormData.adminEmail.trim() || null,
          full_name: companyFormData.adminFullName.trim() || null,
          role: companyFormData.adminRole,
          company_id: newCompany.id.toString()
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Now USE the adminResponse
      const newAdmin = adminResponse.data.admin;
      console.log('Admin created successfully:', newAdmin);

      // Log successful company and admin creation with admin details
      logActivity('create', {
        company_name: companyFormData.name.trim(),
        company_id: newCompany.id,
        tenant_id: companyFormData.tenant_id.trim(),
        admin_id: newAdmin.id, // Use admin response
        admin_username: newAdmin.username, // Use admin response
        admin_role: newAdmin.role, // Use admin response
        admin_email: newAdmin.email, // Use admin response
        created_by: currentAdmin.username,
        success: true
      });

      // Show success message with both company and admin info
      setSuccess(`Company "${newCompany.name}" created successfully! Admin "${newAdmin.username}" (${newAdmin.role}) has been assigned to manage this company.`);
      
      setCreateCompanyModal(false);
      resetCompanyForm();
      await Promise.all([loadAdmins(), loadCompanies()]);

    } catch (err) {
      console.error('Error creating company:', err);
      
      // Determine where the error occurred
      const isCompanyCreationError = !createdCompany;
      const errorLocation = isCompanyCreationError ? 'company creation' : 'admin creation';
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          `Failed during ${errorLocation}`;

      setError(errorMessage);
      
      
      
      if (createdCompany && errorLocation === 'admin creation') {
        setError(`Company "${createdCompany.name}" was created successfully, but failed to create admin: ${errorMessage}. You can create the admin separately.`);
        
      }
      
      // Log failed creation with more details
      logActivity('fail', {
        company_name: companyFormData.name.trim(),
        tenant_id: companyFormData.tenant_id.trim(),
        company_created: !!createdCompany,
        company_id: createdCompany?.id || null,
        admin_username: companyFormData.adminUsername.trim(),
        error_location: errorLocation,
        error: errorMessage,
        created_by: currentAdmin.username,
        success: false
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAdmins(), loadCompanies()]);
    setRefreshing(false);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModal(true);
  };

  const openCreateCompanyModal = () => {
    resetCompanyForm();
    setCreateCompanyModal(true);
  };

  const openConfirmModal = (admin, action) => {
    setSelectedAdmin(admin);
    setActionType(action);
    setConfirmModal(true);
  };

  const handleStatusChange = async (adminId, newStatus) => {
    try {
      const targetAdmin = admins.find(a => a.id === adminId);
      
      await axios.put(
        `${ADMIN_SERVER}/api/admin/users/${adminId}/status`,
        { status: newStatus },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Log status change
      logActivity('update', {
        target_admin_id: adminId,
        target_admin_username: targetAdmin?.username,
        previous_status: targetAdmin?.status,
        new_status: newStatus,
        updated_by: currentAdmin.username,
        success: true
      });

      setSuccess(`Admin status updated successfully!`);
      await loadAdmins();
    } catch (err) {
      console.error('Error updating admin status:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update admin status';
      setError(errorMessage);
      
      // Log failed status change
      logActivity('fail', {
        target_admin_id: adminId,
        target_admin_username: admins.find(a => a.id === adminId)?.username,
        attempted_status: newStatus,
        error: errorMessage,
        updated_by: currentAdmin.username,
        success: false
      });
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      await axios.delete(
        `${ADMIN_SERVER}/api/admin/users/${selectedAdmin.id}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Log admin deletion
      logActivity('delete', {
        deleted_admin_id: selectedAdmin.id,
        deleted_admin_username: selectedAdmin.username,
        deleted_admin_role: selectedAdmin.role,
        deleted_by: currentAdmin.username,
        success: true
      });

      setSuccess(`Admin ${selectedAdmin.username} has been deactivated!`);
      setConfirmModal(false);
      await loadAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to delete admin';
      setError(errorMessage);
      
      // Log failed admin deletion
      logActivity('fail', {
        target_admin_id: selectedAdmin.id,
        target_admin_username: selectedAdmin.username,
        error: errorMessage,
        deleted_by: currentAdmin.username,
        success: false
      });
    }
  };

  const confirmAction = () => {
    if (actionType === 'delete') {
      handleDeleteAdmin();
    }
  };

  const getRoleBadge = (role) => (
    <CBadge color={ROLE_COLORS[role] || 'secondary'}>
      <CIcon 
        icon={role === 'superadmin' ? cilShieldAlt : role === 'systemadmin' ? cilSettings : cilUser} 
        className="me-1" 
      />
      {role === 'superadmin' ? 'Super Admin' : 
       role === 'systemadmin' ? 'System Admin' : 'Admin'}
    </CBadge>
  );

  const getStatusBadge = (status) => (
    <CBadge color={STATUS_COLORS[status] || 'secondary'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </CBadge>
  );

  if (loading) {
    return (
      <CContainer className="mt-4">
        <div className="text-center py-5">
          <CSpinner size="lg" />
          <div className="mt-3">Loading admin list from Admin Server...</div>
        </div>
      </CContainer>
    );
  }

  return (
    <CContainer className="mt-4">
      {/* Status Messages */}
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')} className="mb-4">
          {error}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess('')} className="mb-4">
          {success}
        </CAlert>
      )}

      {/* Statistics Cards */}
      <CRow className="mb-4">
        <CCol sm={3}>
          <CCard className="text-center border-primary">
            <CCardBody>
              <div className="text-primary fs-2 fw-bold">{stats.total}</div>
              <div className="text-muted">Total Admins</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={3}>
          <CCard className="text-center border-danger">
            <CCardBody>
              <div className="text-danger fs-2 fw-bold">{stats.superadmins}</div>
              <div className="text-muted">Super Admins</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={3}>
          <CCard className="text-center border-info">
            <CCardBody>
              <div className="text-info fs-2 fw-bold">{stats.regularAdmins}</div>
              <div className="text-muted">Regular Admins</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={3}>
          <CCard className="text-center border-warning">
            <CCardBody>
              <div className="text-warning fs-2 fw-bold">{currentAdmin.role === 'systemadmin' ? stats.totalCompanies : stats.systemAdmins}</div>
              <div className="text-muted">{currentAdmin.role === 'systemadmin' ? 'Companies' : 'System Admins'}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Main Content */}
      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <CCardTitle className="mb-0">
              <CIcon icon={cilPeople} className="me-2" />
              {currentAdmin.role === 'systemadmin' ? 'System Management' : 'Admin Management'}
            </CCardTitle>
            <div className="d-flex gap-2">
              {currentAdmin.role === 'systemadmin' && (
                <CTooltip content="Create new company with admin">
                  <CButton color="success" onClick={openCreateCompanyModal}>
                    <CIcon icon={cilBuilding} className="me-2" />
                    Add Company
                  </CButton>
                </CTooltip>
              )}
              {(currentAdmin.role === 'superadmin' || currentAdmin.role === 'systemadmin') && (
                <CTooltip content="Create new admin account">
                  <CButton color="primary" onClick={openCreateModal}>
                    <CIcon icon={cilUserPlus} className="me-2" />
                    Add Admin
                  </CButton>
                </CTooltip>
              )}
              <CTooltip content="Refresh data from server">
                <CButton 
                  color="secondary" 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <CIcon icon={cilReload} className={refreshing ? 'spinner-border spinner-border-sm' : ''} />
                </CButton>
              </CTooltip>
            </div>
          </div>
        </CCardHeader>
        <CCardBody>
          {/* Tabs for System Admin */}
          {currentAdmin.role === 'systemadmin' && (
            <CNav variant="tabs" className="mb-4">
              <CNavItem>
                <CNavLink 
                  href="#" 
                  active={activeTab === 'admins'}
                  onClick={(e) => { e.preventDefault(); setActiveTab('admins'); }}
                >
                  <CIcon icon={cilPeople} className="me-1" />
                  Admins ({stats.total})
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink 
                  href="#"
                  active={activeTab === 'companies'}
                  onClick={(e) => { e.preventDefault(); setActiveTab('companies'); }}
                >
                  <CIcon icon={cilBuilding} className="me-1" />
                  Companies ({companies.length})
                </CNavLink>
              </CNavItem>
            </CNav>
          )}

          <CTabContent>
            {/* Admins Tab */}
            <CTabPane visible={activeTab === 'admins' || currentAdmin.role !== 'systemadmin'}>
              {/* Filters */}
              <CRow className="mb-4">
                <CCol md={6}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search admins by username, email, or name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="systemadmin">System Admin</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Results Info */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">
                  Showing {filteredAdmins.length} of {admins.length} admins
                </div>
                <div className="text-muted small">
                  Current User: <strong>{currentAdmin.username}</strong> {getRoleBadge(currentAdmin.role)}
                </div>
              </div>

              {/* Admin Table */}
              {filteredAdmins.length === 0 ? (
                <CAlert color="info" className="text-center">
                  <CIcon icon={cilUser} className="me-2" />
                  No admins found. {search && 'Try adjusting your search criteria.'}
                </CAlert>
              ) : (
                <div className="table-responsive">
                  <CTable striped hover>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell width="5%">#</CTableHeaderCell>
                        <CTableHeaderCell width="20%">Username</CTableHeaderCell>
                        <CTableHeaderCell width="25%">Email</CTableHeaderCell>
                        <CTableHeaderCell width="20%">Company</CTableHeaderCell>
                        <CTableHeaderCell width="15%">Role</CTableHeaderCell>
                        <CTableHeaderCell width="10%">Status</CTableHeaderCell>
                        <CTableHeaderCell width="15%">Created</CTableHeaderCell>
                        {(currentAdmin.role === 'superadmin' || currentAdmin.role === 'systemadmin') && (
                          <CTableHeaderCell width="10%">Actions</CTableHeaderCell>
                        )}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredAdmins.map((admin, index) => (
                        <CTableRow key={admin.id}>
                          <CTableDataCell>{index + 1}</CTableDataCell>
                          <CTableDataCell>
                            <div className="d-flex align-items-center">
                              <CIcon icon={cilUser} className="me-2 text-muted" />
                              <strong>{admin.username}</strong>
                              {admin.username === currentAdmin.username && (
                                <CBadge color="info" className="ms-2">You</CBadge>
                              )}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell>
                            {admin.email || <span className="text-muted">-</span>}
                          </CTableDataCell>
                          {/* <CTableDataCell>
                            {admin.company_id ? (
                              <small className="text-muted">{admin.company_id}</small>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </CTableDataCell> */}
                          <CTableDataCell>
                            {admin.company_id ? (
                              (() => {
                                const company = companies.find(c => c.id == admin.company_id);
                                return company ? (
                                  <div>
                                    <strong>{company.name}</strong>
                                    <br />
                                    <small className="text-muted">{company.tenant_id}</small>
                                  </div>
                                ) : (
                                  <small className="text-muted">{admin.company_id}</small>
                                );
                              })()
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {getRoleBadge(admin.role)}
                          </CTableDataCell>
                          <CTableDataCell>
                            {getStatusBadge(admin.status || 'active')}
                          </CTableDataCell>
                          <CTableDataCell>
                            <small>
                              {admin.created_at 
                                ? new Date(admin.created_at).toLocaleDateString()
                                : '-'
                              }
                              {/* {admin.last_login && (
                                <>
                                  <br />
                                  <span className="text-success">
                                    Last: {new Date(admin.last_login).toLocaleDateString()}
                                  </span>
                                </>
                              )} */}
                            </small>
                          </CTableDataCell>
                          {(currentAdmin.role === 'superadmin' || currentAdmin.role === 'systemadmin') && (
                            <CTableDataCell>
                              {admin.username !== currentAdmin.username && (
                                <CDropdown>
                                  <CDropdownToggle 
                                    color="secondary" 
                                    variant="outline" 
                                    size="sm"
                                  >
                                    <CIcon icon={cilOptions} />
                                  </CDropdownToggle>
                                  <CDropdownMenu>
                                    {(admin.status || 'active') === 'active' ? (
                                      <>
                                        <CDropdownItem onClick={() => handleStatusChange(admin.id, 'suspended')}>
                                          Suspend Account
                                        </CDropdownItem>
                                        <CDropdownItem onClick={() => handleStatusChange(admin.id, 'inactive')}>
                                          Deactivate Account
                                        </CDropdownItem>
                                      </>
                                    ) : (
                                      <CDropdownItem onClick={() => handleStatusChange(admin.id, 'active')}>
                                        Activate Account
                                      </CDropdownItem>
                                    )}
                                    <CDropdownItem 
                                      className="text-danger"
                                      onClick={() => openConfirmModal(admin, 'delete')}
                                    >
                                      Delete Account
                                    </CDropdownItem>
                                  </CDropdownMenu>
                                </CDropdown>
                              )}
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </CTabPane>

            {/* Companies Tab (Only for System Admin) */}
            {currentAdmin.role === 'systemadmin' && (
              <CTabPane visible={activeTab === 'companies'}>
                <div className="mb-3">
                  <h5>Company Management</h5>
                  <p className="text-muted">Manage companies and their administrators</p>
                </div>

                {companies.length === 0 ? (
                  <CAlert color="info" className="text-center">
                    <CIcon icon={cilBuilding} className="me-2" />
                    No companies found. Create your first company using the "Add Company" button.
                  </CAlert>
                ) : (
                  <div className="table-responsive">
                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell width="5%">#</CTableHeaderCell>
                          <CTableHeaderCell width="25%">Company Name</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Tenant ID</CTableHeaderCell>
                          <CTableHeaderCell width="20%">Email</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Register Number</CTableHeaderCell>
                          <CTableHeaderCell width="10%">Status</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Created</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {companies.map((company, index) => (
                          <CTableRow key={company.id}>
                            <CTableDataCell>{index + 1}</CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex align-items-center">
                                <CIcon icon={cilBuilding} className="me-2 text-muted" />
                                <strong>{company.name}</strong>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <code className="text-muted">{company.tenant_id}</code>
                            </CTableDataCell>
                            <CTableDataCell>
                              {company.email || <span className="text-muted">-</span>}
                            </CTableDataCell>
                            <CTableDataCell>
                              {company.register_number || <span className="text-muted">-</span>}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={company.status === 1 ? 'success' : 'secondary'}>
                                {company.status === 1 ? 'Active' : 'Inactive'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <small>
                                {new Date(company.created_at).toLocaleDateString()}
                                <br />
                                <span className="text-muted">by {company.created_by}</span>
                              </small>
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CTabPane>
            )}
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Create Admin Modal */}
      <CModal visible={createModal} onClose={() => setCreateModal(false)} size="lg" backdrop="static">
        <CModalHeader>
          <CModalTitle>Create New Admin</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCreateAdmin}>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Username *</CFormLabel>
                  <CFormInput
                    value={formData.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    invalid={!!formErrors.username}
                    feedback={formErrors.username}
                    placeholder="Enter username"
                  />
                  <small className="text-muted">Letters, numbers, dots, underscores, and hyphens only</small>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Password *</CFormLabel>
                  <CFormInput
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    invalid={!!formErrors.password}
                    feedback={formErrors.password}
                    placeholder="Enter password (min 6 chars)"
                  />
                </div>
              </CCol>
            </CRow>
            
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Email</CFormLabel>
                  <CFormInput
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    invalid={!!formErrors.email}
                    feedback={formErrors.email}
                    placeholder="admin@company.com"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Full Name</CFormLabel>
                  <CFormInput
                    value={formData.full_name}
                    onChange={(e) => handleFormChange('full_name', e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Role *</CFormLabel>
                  <CFormSelect
                    value={formData.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                    invalid={!!formErrors.role}
                    feedback={formErrors.role}
                  >
                    <option value="admin">Admin</option>
                    {/* System Admin can create both Admin and Super Admin */}
                    {currentAdmin.role === 'systemadmin' && (
                      <option value="superadmin">Super Admin</option>
                    )}
                    {/* Only System Admin can create other System Admins */}
                    {currentAdmin.role === 'systemadmin' && (
                      <option value="systemadmin">System Admin</option>
                    )}
                  </CFormSelect>
                  <small className="text-muted">
                    {currentAdmin.role === 'systemadmin' 
                      ? 'System Admins can create all types of admins.'
                      : 'Super Admins can manage other admins. Regular Admins can only manage employees.'
                    }
                  </small>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Company ID</CFormLabel>
                  {currentAdmin.role === 'systemadmin' ? (
                    <CFormSelect
                      value={formData.company_id}
                      onChange={(e) => handleFormChange('company_id', e.target.value)}
                    >
                      <option value="">No company (System level)</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name} ({company.tenant_id})
                        </option>
                      ))}
                    </CFormSelect>
                  ) : (
                    <CFormInput
                      value={formData.company_id}
                      onChange={(e) => handleFormChange('company_id', e.target.value)}
                      placeholder="Leave empty for system admin"
                    />
                  )}
                  <small className="text-muted">Associate admin with specific company</small>
                </div>
              </CCol>
            </CRow>

            <div className="mb-3 p-3 bg-info-subtle rounded">
              <small className="text-muted">
                <strong>Note:</strong> New admin will be created on Admin Server (localhost:5001) 
                and all actions will be logged for audit purposes.
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton 
            color="secondary" 
            onClick={() => setCreateModal(false)}
            disabled={submitting}
          >
            Cancel
          </CButton>
          <CButton 
            color="primary" 
            onClick={handleCreateAdmin}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating on Admin Server...
              </>
            ) : (
              <>
                <CIcon icon={cilUserPlus} className="me-2" />
                Create Admin
              </>
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Create Company Modal */}
      <CModal visible={createCompanyModal} onClose={() => setCreateCompanyModal(false)} size="xl" backdrop="static">
        <CModalHeader>
          <CModalTitle>Create New Company & Admin</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleCreateCompany}>
            <h6 className="text-primary mb-3">Company Information</h6>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Company Name *</CFormLabel>
                  <CFormInput
                    value={companyFormData.name}
                    onChange={(e) => handleCompanyFormChange('name', e.target.value)}
                    invalid={!!companyFormErrors.name}
                    feedback={companyFormErrors.name}
                    placeholder="Enter company name"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Tenant ID *</CFormLabel>
                  <CFormInput
                    value={companyFormData.tenant_id}
                    onChange={(e) => handleCompanyFormChange('tenant_id', e.target.value)}
                    invalid={!!companyFormErrors.tenant_id}
                    feedback={companyFormErrors.tenant_id}
                    placeholder="unique-tenant-id"
                  />
                  <small className="text-muted">Unique identifier for this company</small>
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Company Email</CFormLabel>
                  <CFormInput
                    type="email"
                    value={companyFormData.email}
                    onChange={(e) => handleCompanyFormChange('email', e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Register Number</CFormLabel>
                  <CFormInput
                    value={companyFormData.registerNumber}
                    onChange={(e) => handleCompanyFormChange('registerNumber', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
              </CCol>
            </CRow>

            <hr className="my-4" />

            <h6 className="text-success mb-3">Administrator Account</h6>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Admin Username *</CFormLabel>
                  <CFormInput
                    value={companyFormData.adminUsername}
                    onChange={(e) => handleCompanyFormChange('adminUsername', e.target.value)}
                    invalid={!!companyFormErrors.adminUsername}
                    feedback={companyFormErrors.adminUsername}
                    placeholder="admin username"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Admin Password *</CFormLabel>
                  <CFormInput
                    type="password"
                    value={companyFormData.adminPassword}
                    onChange={(e) => handleCompanyFormChange('adminPassword', e.target.value)}
                    invalid={!!companyFormErrors.adminPassword}
                    feedback={companyFormErrors.adminPassword}
                    placeholder="Enter password (min 6 chars)"
                  />
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Admin Email</CFormLabel>
                  <CFormInput
                    type="email"
                    value={companyFormData.adminEmail}
                    onChange={(e) => handleCompanyFormChange('adminEmail', e.target.value)}
                    invalid={!!companyFormErrors.adminEmail}
                    feedback={companyFormErrors.adminEmail}
                    placeholder="admin@company.com"
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Admin Full Name</CFormLabel>
                  <CFormInput
                    value={companyFormData.adminFullName}
                    onChange={(e) => handleCompanyFormChange('adminFullName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Admin Role</CFormLabel>
                  <CFormSelect
                    value={companyFormData.adminRole}
                    onChange={(e) => handleCompanyFormChange('adminRole', e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </CFormSelect>
                  <small className="text-muted">Super Admin can manage other admins for this company</small>
                </div>
              </CCol>
              <CCol md={6} className="d-flex align-items-center">
                <div className="text-muted small">
                  <strong>Created by:</strong> {currentAdmin.username}<br />
                  <strong>Date:</strong> {CURRENT_DATE_TIME}
                </div>
              </CCol>
            </CRow>

            <div className="mb-3 p-3 bg-success-subtle rounded">
              <small className="text-dark">
                <strong>What will happen:</strong>
                <ul className="mb-0 mt-2">
                  <li>Company will be created with the provided information</li>
                  <li>Admin account will be created and linked to the company</li>
                  <li>Admin will be able to manage employees for this company</li>
                  <li>All actions will be logged for audit purposes</li>
                </ul>
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton 
            color="secondary" 
            onClick={() => setCreateCompanyModal(false)}
            disabled={submitting}
          >
            Cancel
          </CButton>
          <CButton 
            color="success" 
            onClick={handleCreateCompany}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating Company & Admin...
              </>
            ) : (
              <>
                <CIcon icon={cilBuilding} className="me-2" />
                Create Company & Admin
              </>
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Confirmation Modal */}
      <CModal visible={confirmModal} onClose={() => setConfirmModal(false)}>
        <CModalHeader>
          <CModalTitle>Confirm Action</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {actionType === 'delete' && selectedAdmin && (
            <div>
              <p>Are you sure you want to delete admin <strong>{selectedAdmin.username}</strong>?</p>
              <div className="p-3 bg-body-secondary rounded mb-3">
                <strong>Admin Details:</strong>
                <br />
                <strong>Username:</strong> {selectedAdmin.username}
                <br />
                <strong>Role:</strong> {getRoleBadge(selectedAdmin.role)}
                <br />
                <strong>Company:</strong> {selectedAdmin.company_id || 'N/A'}
              </div>
              <p className="text-warning">
                <strong>Warning:</strong> This action will deactivate the admin account. 
                The admin will no longer be able to access the system.
              </p>
              <div className="mb-3 p-2 bg-danger-subtle rounded">
                <small className="text-dark">
                  <strong>Note:</strong> Deletion will be processed on Admin Server 
                  and permanently logged for audit purposes.
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setConfirmModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={confirmAction}>
            {actionType === 'delete' ? 'Delete Admin' : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default List;