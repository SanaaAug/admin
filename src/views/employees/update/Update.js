import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CContainer, CRow, CCol, CFormInput, CButton, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CFormSelect, CAlert, CSpinner,
  CBadge, CTooltip
} from '@coreui/react';
import { useSelector } from 'react-redux';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
const EMPLOYEE_SERVER = 'http://localhost:5002';
const CURRENT_DATE_TIME = new Date().toISOString();

const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TERMINATED: 'terminated',
  UNASSIGNED: 'unassigned'
};

const STATUS_COLORS = {
  [EMPLOYEE_STATUS.ACTIVE]: 'success',
  [EMPLOYEE_STATUS.INACTIVE]: 'warning',
  [EMPLOYEE_STATUS.TERMINATED]: 'danger',
  [EMPLOYEE_STATUS.UNASSIGNED]: 'secondary'
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

const Update = () => {
  // Get current admin from Redux
  const admin = useSelector(state => state.admin) || { 
    username: 'SanaaAug', 
    id: 1, 
    company_id: 'e1b21e25-0c31-4a1e-8d8e-f658597e7420' 
  };

  // State management
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    department: '',
    status: ''
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  // Memoized filtered employees
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    
    const keyword = search.toLowerCase();
    return employees.filter(emp =>
      emp.username?.toLowerCase().includes(keyword) ||
      emp.firstname?.toLowerCase().includes(keyword) ||
      emp.lastname?.toLowerCase().includes(keyword) ||
      emp.job_title?.toLowerCase().includes(keyword) ||
      emp.department?.toLowerCase().includes(keyword) ||
      emp.email?.toLowerCase().includes(keyword)
    );
  }, [employees, search]);

  // Log activity to admin server
  const logActivity = async (action, details) => {
    try {
      // Since the admin server doesn't have a specific activity endpoint,
      // we'll make a request to the audit system or create a simple logging endpoint
      await axios.post(
        `${ADMIN_SERVER}/api/admin/activity`,
        {
          action,
          details,
          timestamp: new Date().toISOString(),
          user: admin?.username || 'unknown',
          company_id: admin?.company_id || null
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

  // API functions
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(
        `${EMPLOYEE_SERVER}/internal/company/employee/list?id=${admin.company_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );
      
      setEmployees(response.data.emps || []);
      
      // Log successful data load
      // logActivity('load_employees', {
      //   company_id: admin.company_id,
      //   employee_count: response.data.emps?.length || 0,
      //   success: true
      // });
      
    } catch (err) {
      console.error('Failed to load employees:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load employees. Please try again.';
      setError(errorMessage);
      
      // Log failed data load
      // logActivity('load_employees_failed', {
      //   company_id: admin.company_id,
      //   error: errorMessage,
      //   success: false
      // });
    } finally {
      setLoading(false);
    }
  }, [admin.company_id, admin.username]);

  // Load employees on component mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Form handlers
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required';
    }
    
    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }
    
    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      jobTitle: '',
      department: '',
      status: ''
    });
    setFormErrors({});
  };

  const openEditModal = (employee) => {
    setSelected(employee);
    setFormData({
      jobTitle: employee.job_title || '',
      department: employee.department || '',
      status: employee.status || EMPLOYEE_STATUS.ACTIVE
    });
    setFormErrors({});
    setEditModal(true);
  };

  const closeEditModal = () => {
    setEditModal(false);
    setSelected(null);
    resetForm();
  };

  const updateEmployee = async () => {
    if (!validateForm() || !selected) return;

    try {
      setUpdating(true);
      setError('');

      // Update employee on employee server
      const response = await axios.put(
        `${EMPLOYEE_SERVER}/internal/company/employee/${selected.uuid}`,
        {
          job_title: formData.jobTitle.trim(),
          department: formData.department.trim(),
          status: formData.status,
          updated_by: admin.username
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          } 
        }
      );

      // Log successful update to admin server
      logActivity('update', {
        employee_uuid: selected.uuid,
        employee_username: selected.username,
        employee_name: selected.fullName || `${selected.firstname} ${selected.lastname}`,
        changes: {
          job_title: { from: selected.job_title, to: formData.jobTitle.trim() },
          department: { from: selected.department, to: formData.department.trim() },
          status: { from: selected.status, to: formData.status }
        },
        company_id: admin.company_id,
        updated_by: admin.username,
        success: true
      });

      setSuccess(`Employee ${selected.username} updated successfully!`);
      closeEditModal();
      await loadEmployees();
    } catch (err) {
      console.error('Failed to update employee:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update employee. Please try again.';
      setError(errorMessage);
      
      // Log failed update to admin server
      logActivity('fail', {
        employee_uuid: selected.uuid,
        employee_username: selected.username,
        error: errorMessage,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: false
      });
    } finally {
      setUpdating(false);
    }
  };

  const deactivateEmployee = async (employee) => {
    const confirmMessage = `Are you sure you want to deactivate ${employee.username}? This action can be reversed later.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      setError('');

      // Deactivate employee on employee server
      await axios.put(
        `${EMPLOYEE_SERVER}/internal/company/employee/${employee.uuid}`,
        {
          job_title: employee.job_title || '',
          department: employee.department || '',
          status: EMPLOYEE_STATUS.INACTIVE,
          updated_by: admin.username
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );

      // Log successful deactivation to admin server
      logActivity('deactivate', {
        employee_uuid: employee.uuid,
        employee_username: employee.username,
        employee_name: employee.fullName || `${employee.firstname} ${employee.lastname}`,
        previous_status: employee.status,
        new_status: EMPLOYEE_STATUS.INACTIVE,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: true
      });

      setSuccess(`Employee ${employee.username} deactivated successfully!`);
      await loadEmployees();
    } catch (err) {
      console.error('Failed to deactivate employee:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to deactivate employee. Please try again.';
      setError(errorMessage);
      
      // Log failed deactivation to admin server
      logActivity('fail', {
        employee_uuid: employee.uuid,
        employee_username: employee.username,
        error: errorMessage,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const color = STATUS_COLORS[status] || 'secondary';
    const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    
    return <CBadge color={color}>{displayStatus}</CBadge>;
  };

  const renderTableContent = () => {
    if (loading) {
      return (
        <CTableRow>
          <CTableDataCell colSpan="8" className="text-center py-4">
            <CSpinner size="sm" className="me-2" />
            Loading employees from Employee Server...
          </CTableDataCell>
        </CTableRow>
      );
    }

    if (filteredEmployees.length === 0) {
      const message = search.trim() 
        ? `No employees found matching "${search}"` 
        : 'No employees found';
      
      return (
        <CTableRow>
          <CTableDataCell colSpan="8" className="text-center py-4 text-muted">
            {message}
          </CTableDataCell>
        </CTableRow>
      );
    }

    return filteredEmployees.map(employee => (
      <CTableRow key={employee.uuid || employee.id}>
        <CTableDataCell>{employee.id}</CTableDataCell>
        <CTableDataCell className="fw-semibold">{employee.username}</CTableDataCell>
        <CTableDataCell>{employee.fullName || `${employee.firstname} ${employee.lastname}`}</CTableDataCell>
        <CTableDataCell>{employee.job_title || '-'}</CTableDataCell>
        <CTableDataCell>{employee.department || '-'}</CTableDataCell>
        <CTableDataCell>{getStatusBadge(employee.status)}</CTableDataCell>
        <CTableDataCell>{employee.email || '-'}</CTableDataCell>
        <CTableDataCell>
          <div className="d-flex gap-2">
            <CTooltip content="Edit employee details">
              <CButton 
                size="sm" 
                color="info" 
                variant="outline"
                onClick={() => openEditModal(employee)}
                disabled={loading}
              >
                Edit
              </CButton>
            </CTooltip>
            <CTooltip content="Deactivate employee">
              <CButton 
                size="sm" 
                color="danger" 
                variant="outline"
                onClick={() => deactivateEmployee(employee)}
                disabled={loading || employee.status === EMPLOYEE_STATUS.INACTIVE}
              >
                Deactivate
              </CButton>
            </CTooltip>
          </div>
        </CTableDataCell>
      </CTableRow>
    ));
  };

  return (
    <CContainer className="mt-4">
      {/* Alert Messages */}
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </CAlert>
      )}

      {/* Server Status Info */}
      {/* <div className="mb-4 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.1)', border: '1px solid rgba(13, 202, 240, 0.2)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">Employee Server:</small>
            <strong className="ms-2">localhost:5002</strong>
          </div>
          <div>
            <small className="text-muted">Admin Server:</small>
            <strong className="ms-2">localhost:5001</strong>
          </div>
        </div>
      </div> */}

      {/* Header and Search */}
      <CRow className="mb-4">
        <CCol md={6}>
          <h2 className="mb-0">Employee Management</h2>
          <p className="text-muted">Manage employee information and status</p>
        </CCol>
        <CCol md={6}>
          <CFormInput
            placeholder="Search by username, name, job title, department, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <small className="text-muted">
            Showing {filteredEmployees.length} of {employees.length} employees
          </small>
        </CCol>
      </CRow>

      {/* Current User Info */}
      <CRow className="mb-3">
        <CCol>
          <div className="d-flex justify-content-between align-items-center text-muted small">
            <span>Current User: <strong>{admin.username}</strong> | Company: <strong>{admin.company_id}</strong></span>
            <span>Current Time: <strong>{CURRENT_DATE_TIME} UTC</strong></span>
          </div>
        </CCol>
      </CRow>

      {/* Employee Table */}
      <CTable striped hover responsive>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>ID</CTableHeaderCell>
            <CTableHeaderCell>Username</CTableHeaderCell>
            <CTableHeaderCell>Full Name</CTableHeaderCell>
            <CTableHeaderCell>Job Title</CTableHeaderCell>
            <CTableHeaderCell>Department</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {renderTableContent()}
        </CTableBody>
      </CTable>

      {/* Edit Modal */}
      <CModal visible={editModal} onClose={closeEditModal} backdrop="static">
        <CModalHeader>
          <CModalTitle>Edit Employee: {selected?.username}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {/* Employee Info Display */}
          <div className="mb-3 p-3 rounded">
            <div className="row">
              <div className="col-md-6">
                <strong>Employee:</strong> {selected?.fullName || `${selected?.firstname} ${selected?.lastname}`}
                <br />
                <strong>Username:</strong> {selected?.username}
                <br />
                <strong>Email:</strong> {selected?.email || 'N/A'}
              </div>
              <div className="col-md-6">
                <strong>UUID:</strong> {selected?.uuid}
                <br />
                <strong>Current Status:</strong> {getStatusBadge(selected?.status)}
                <br />
                <strong>Company ID:</strong> {selected?.company_id}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <CFormInput
              label="Job Title *"
              value={formData.jobTitle}
              onChange={(e) => handleFormChange('jobTitle', e.target.value)}
              invalid={!!formErrors.jobTitle}
              feedback={formErrors.jobTitle}
              placeholder="Enter job title"
            />
          </div>
          
          <div className="mb-3">
            <CFormSelect
              label="Department *"
              value={formData.department}
              onChange={(e) => handleFormChange('department', e.target.value)}
              invalid={!!formErrors.department}
              feedback={formErrors.department}
            >
              <option value="">Select department</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Management">Management</option>
              <option value="Frontline">Frontline</option>
              <option value="123">123</option>
            </CFormSelect>
          </div>
          
          <div className="mb-3">
            <CFormSelect
              label="Status *"
              value={formData.status}
              onChange={(e) => handleFormChange('status', e.target.value)}
              invalid={!!formErrors.status}
              feedback={formErrors.status}
            >
              <option value="">Select status</option>
              <option value={EMPLOYEE_STATUS.ACTIVE}>Active</option>
              <option value={EMPLOYEE_STATUS.INACTIVE}>Inactive</option>
              <option value={EMPLOYEE_STATUS.UNASSIGNED}>Unassigned</option>
              <option value={EMPLOYEE_STATUS.TERMINATED}>Terminated</option>
            </CFormSelect>
          </div>
          
          <div className="mb-3">
            <CFormInput
              label="Updated By"
              value={admin.username}
              disabled
            />
            <small className="text-muted">Current logged-in user</small>
          </div>

          <div className="mb-3">
            <CFormInput
              label="Update Time"
              value={`${CURRENT_DATE_TIME} UTC`}
              disabled
            />
            <small className="text-muted">Timestamp when changes are saved</small>
          </div>

          <div className="mb-3 p-2 bg-warning bg-opacity-10 rounded">
            <small className="text-muted">
              <strong>Note:</strong> Changes will be sent to Employee Server (port 5002) 
              and audit logs will be recorded on Admin Server (port 5001).
            </small>
          </div>

          <div className="text-muted small">
            * Required fields
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton 
            color="secondary" 
            onClick={closeEditModal}
            disabled={updating}
          >
            Cancel
          </CButton>
          <CButton 
            color="primary" 
            onClick={updateEmployee}
            disabled={updating}
          >
            {updating ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Updating on Employee Server...
              </>
            ) : (
              'Save Changes'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Update;