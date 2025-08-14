import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CButton, CBadge, CSpinner, CAlert, CModal, CModalHeader, CModalTitle,
  CModalBody, CModalFooter, CForm, CFormInput, CFormSelect, CFormLabel,
  CInputGroup, CInputGroupText, CDropdown, CDropdownToggle,
  CDropdownMenu, CDropdownItem, CFormTextarea, CPagination, CPaginationItem,
  CProgress
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilPhone, cilUser, cilDollar, cilSettings, cilPencil, cilTrash,
  cilSearch, cilReload, cilOptions, cilCreditCard, cilUserFollow,
  cilBan, cilCheckCircle, cilWarning, cilClock, cilX
} from '@coreui/icons';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
const EMPLOYEE_SERVER = 'http://localhost:5002';
var CURRENT_DATE_TIME = new Date().toISOString();
const ITEMS_PER_PAGE = 25;

const STATUS_COLORS = {
  active: 'success',
  unassigned: 'secondary',
  suspended: 'warning',
  terminated: 'danger'
};

const PAYMENT_STATUS_COLORS = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger'
};

const PAYMENT_STATUS_ICONS = {
  paid: cilCheckCircle,
  pending: cilClock,
  overdue: cilWarning
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
  const admin = useSelector(state => state.admin) || { 
    username: 'SanaaAug', 
    id: 1, 
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    company_id: 'e1b21e25-0c31-4a1e-8d8e-f658597e7420' 
  };

  // Data state
  const [numbers, setNumbers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unassigned: 0,
    suspended: 0,
    assigned: 0,
    paid: 0,
    pending: 0,
    overdue: 0
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    payment_status: '',
    product_code: '',
    assigned_employee_id: ''
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    pages: 0
  });

  // Modal states
  const [assignModal, setAssignModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);

  // Form states
  const [assignData, setAssignData] = useState({ employeeId: '', notes: '' });
  const [paymentData, setPaymentData] = useState({ 
    paymentStatus: '', 
    paymentAmount: '', 
    notes: '' 
  });
  const [statusData, setStatusData] = useState({ status: '', notes: '' });

  // Log activity to admin server
  const logActivity = async (action, details) => {
    try {
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

  // Load phone numbers
  const loadNumbers = useCallback(async () => {
    try {
      setError('');

      const response = await axios.get(
        `${EMPLOYEE_SERVER}/internal/company/number/list?company_id=${admin.company_id}`,
        {
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );

      const numbersData = response.data.numbers || [];
      setNumbers(numbersData);
      
      // Calculate stats from the data
      const calculatedStats = {
        total: numbersData.length,
        active: numbersData.filter(n => n.status === 'active').length,
        unassigned: numbersData.filter(n => n.status === 'unassigned').length,
        suspended: numbersData.filter(n => n.status === 'suspended').length,
        assigned: numbersData.filter(n => n.assigned_employee_id).length,
        paid: numbersData.filter(n => n.payment_status === 'paid').length,
        pending: numbersData.filter(n => n.payment_status === 'pending').length,
        overdue: numbersData.filter(n => n.payment_status === 'overdue').length
      };
      setStats(calculatedStats);

      setPagination(prev => ({
        ...prev,
        total: numbersData.length,
        pages: Math.ceil(numbersData.length / prev.limit)
      }));

      // Log successful data load
      // logActivity('load_phone_numbers', {
      //   company_id: admin.company_id,
      //   total_numbers: numbersData.length,
      //   stats: calculatedStats,
      //   success: true
      // });

    } catch (err) {
      console.error('Error loading numbers:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load phone numbers';
      setError(errorMessage);
      
      // Log failed data load
      // logActivity('load_phone_numbers_failed', {
      //   company_id: admin.company_id,
      //   error: errorMessage,
      //   success: false
      // });
    }
  }, [admin.company_id, admin.username]);

  // Load supporting data
  const loadSupportingData = useCallback(async () => {
    try {
      const [employeesRes, productsRes] = await Promise.all([
        axios.get(
          `${EMPLOYEE_SERVER}/internal/company/employee/list?id=${admin.company_id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            }
          }
        ),
        axios.get(
          `${EMPLOYEE_SERVER}/api/products`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            }
          }
        )
      ]);

      setEmployees(employeesRes.data.emps || []);
      setProducts(productsRes.data.products || []);

      // Log successful support data load
      // logActivity('load_phone_support_data', {
      //   company_id: admin.company_id,
      //   employee_count: employeesRes.data.emps?.length || 0,
      //   product_count: productsRes.data.products?.length || 0,
      //   success: true
      // });
      
    } catch (err) {
      console.error('Error loading supporting data:', err);
      
      // Log failed support data load
      logActivity('load_phone_support_data_failed', {
        company_id: admin.company_id,
        error: err.response?.data?.error || err.message,
        success: false
      });
    }
  }, [admin.company_id, admin.username]);

  // Filter numbers based on filters
  const filteredNumbers = useMemo(() => {
    if (!numbers) return [];
    
    return numbers.filter(number => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = 
          number.phone_number?.toLowerCase().includes(searchTerm) ||
          number.assigned_employee_name?.toLowerCase().includes(searchTerm) ||
          number.product_code?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && number.status !== filters.status) return false;

      // Payment status filter
      if (filters.payment_status && number.payment_status !== filters.payment_status) return false;

      // Product filter
      if (filters.product_code && number.product_code !== filters.product_code) return false;

      // Employee filter
      if (filters.assigned_employee_id) {
        if (filters.assigned_employee_id === 'unassigned' && number.assigned_employee_id) return false;
        if (filters.assigned_employee_id !== 'unassigned' && number.assigned_employee_id !== filters.assigned_employee_id) return false;
      }

      return true;
    });
  }, [numbers, filters]);

  // Paginated numbers
  const paginatedNumbers = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredNumbers.slice(startIndex, endIndex);
  }, [filteredNumbers, pagination.current, pagination.limit]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadNumbers(), loadSupportingData()]);
      setLoading(false);
    };
    loadData();
  }, [loadNumbers, loadSupportingData]);

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

  // Update pagination when filtered numbers change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredNumbers.length,
      pages: Math.ceil(filteredNumbers.length / prev.limit)
    }));
  }, [filteredNumbers]);

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      payment_status: '',
      product_code: '',
      assigned_employee_id: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNumbers(), loadSupportingData()]);
    setRefreshing(false);
  };

  // Pagination handler
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  // Modal handlers
  const openAssignModal = (number) => {
    setSelectedNumber(number);
    setAssignData({ 
      employeeId: number.assigned_employee_id || '', 
      notes: number.notes || '' 
    });
    setAssignModal(true);
  };

  const openPaymentModal = (number) => {
    setSelectedNumber(number);
    setPaymentData({ 
      paymentStatus: number.payment_status, 
      paymentAmount: number.payment_amount || '', 
      notes: number.notes || '' 
    });
    setPaymentModal(true);
  };

  const openStatusModal = (number) => {
    setSelectedNumber(number);
    setStatusData({ 
      status: number.status, 
      notes: number.notes || '' 
    });
    setStatusModal(true);
  };

  const openDeleteModal = (number) => {
    setSelectedNumber(number);
    setDeleteModal(true);
  };

  // API handlers
  const handleAssignment = async () => {
    if (!selectedNumber) return;

    try {
      // Update assignment on employee server
      await axios.put(
        `${EMPLOYEE_SERVER}/internal/company/employee/number/${selectedNumber.uuid}`,
        {
          assigned_employee_id: assignData.employeeId || null,
          updated_by: admin.username,
          notes: assignData.notes
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      const selectedEmployee = employees.find(e => e.uuid === assignData.employeeId);
      const employeeName = selectedEmployee 
        ? (selectedEmployee.fullName || `${selectedEmployee.firstname} ${selectedEmployee.lastname}`)
        : 'None';

      // Log assignment update to admin server
      logActivity('update', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        previous_employee_id: selectedNumber.assigned_employee_id,
        previous_employee_name: selectedNumber.assigned_employee_name,
        new_employee_id: assignData.employeeId || null,
        new_employee_name: employeeName,
        company_id: admin.company_id,
        updated_by: admin.username,
        notes: assignData.notes,
        success: true
      });

      setSuccess(`Assignment updated! Number ${selectedNumber.phone_number} is now assigned to ${employeeName}`);
      setAssignModal(false);
      await loadNumbers();
    } catch (err) {
      console.error('Error updating assignment:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update assignment';
      setError(errorMessage);
      
      // Log failed assignment update
      logActivity('update_phone_assignment_failed', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        error: errorMessage,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: false
      });
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedNumber) return;

    try {
      // Update payment on employee server
      await axios.put(
        `${EMPLOYEE_SERVER}/internal/company/employee/number/${selectedNumber.uuid}`,
        {
          payment_status: paymentData.paymentStatus,
          payment_amount: paymentData.paymentAmount || null,
          updated_by: admin.username,
          notes: paymentData.notes
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Log payment update to admin server
      logActivity('update', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        previous_payment_status: selectedNumber.payment_status,
        previous_payment_amount: selectedNumber.payment_amount,
        new_payment_status: paymentData.paymentStatus,
        new_payment_amount: paymentData.paymentAmount,
        company_id: admin.company_id,
        updated_by: admin.username,
        notes: paymentData.notes,
        success: true
      });

      setSuccess(`Payment status updated to ${paymentData.paymentStatus.toUpperCase()}`);
      setPaymentModal(false);
      await loadNumbers();
    } catch (err) {
      console.error('Error updating payment:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update payment';
      setError(errorMessage);
      
      // Log failed payment update
      logActivity('fail', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        error: errorMessage,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: false
      });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedNumber) return;

    try {
      // Update status on employee server
      await axios.put(
        `${EMPLOYEE_SERVER}/internal/company/employee/number/${selectedNumber.uuid}`,
        {
          status: statusData.status,
          updated_by: admin.username,
          notes: statusData.notes
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          } 
        }
      );

      // Log status update to admin server
      logActivity('update', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        previous_status: selectedNumber.status,
        new_status: statusData.status,
        company_id: admin.company_id,
        updated_by: admin.username,
        reason: statusData.notes,
        success: true
      });

      setSuccess(`Number status updated to ${statusData.status.toUpperCase()}`);
      setStatusModal(false);
      await loadNumbers();
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update status';
      setError(errorMessage);
      
      // Log failed status update
      logActivity('fail', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        error: errorMessage,
        company_id: admin.company_id,
        updated_by: admin.username,
        success: false
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedNumber) return;

    try {
      // Delete phone number on employee server
      await axios.delete(
        `${EMPLOYEE_SERVER}/internal/company/employee/number/${selectedNumber.uuid}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          },
          data: { deleted_by: admin.username }
        }
      );

      // Log deletion to admin server
      logActivity('delete', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        product_code: selectedNumber.product_code,
        assigned_employee_name: selectedNumber.assigned_employee_name,
        company_id: admin.company_id,
        deleted_by: admin.username,
        success: true
      });

      setSuccess(`Phone number ${selectedNumber.phone_number} deleted successfully`);
      setDeleteModal(false);
      await loadNumbers();
    } catch (err) {
      console.error('Error deleting number:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to delete phone number';
      setError(errorMessage);
      
      // Log failed deletion
      logActivity('failed', {
        phone_number: selectedNumber.phone_number,
        phone_uuid: selectedNumber.uuid,
        error: errorMessage,
        company_id: admin.company_id,
        deleted_by: admin.username,
        success: false
      });
    }
  };

  // Helper functions
  const getStatusBadge = (status) => (
    <CBadge color={STATUS_COLORS[status] || 'secondary'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </CBadge>
  );

  const getPaymentStatusBadge = (paymentStatus) => (
    <CBadge color={PAYMENT_STATUS_COLORS[paymentStatus] || 'secondary'}>
      <CIcon icon={PAYMENT_STATUS_ICONS[paymentStatus]} className="me-1" />
      {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
    </CBadge>
  );

  const formatCurrency = (amount) => {
    return `₮${parseInt(amount || 0).toLocaleString()}`;
  };

  const isOverdue = (dueDate, paymentStatus) => {
    if (paymentStatus === 'paid') return false;
    const due = new Date(dueDate);
    const now = new Date(CURRENT_DATE_TIME);
    return due < now;
  };

  if (loading) {
    return (
      <CContainer className="mt-4">
        <div className="text-center py-5">
          <CSpinner size="lg" />
          <div className="mt-3">Loading phone numbers from Employee Server...</div>
          <small className="text-muted">Connecting to localhost:5002</small>
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
        <div className="mt-1">
          <small className="text-muted">Phone operations via Employee Server, audit logs to Admin Server</small>
        </div>
      </div> */}

      {/* Statistics Cards */}
      <CRow className="mb-4">
        <CCol sm={6} md={3}>
          <CCard className="text-center border-primary">
            <CCardBody>
              <div className="text-primary fs-2 fw-bold">{stats.total}</div>
              <div className="text-muted">Total Numbers</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-success">
            <CCardBody>
              <div className="text-success fs-2 fw-bold">{stats.active}</div>
              <div className="text-muted">Active</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-warning">
            <CCardBody>
              <div className="text-warning fs-2 fw-bold">{stats.pending}</div>
              <div className="text-muted">Pending Payment</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-secondary">
            <CCardBody>
              <div className="text-secondary fs-2 fw-bold">{stats.unassigned}</div>
              <div className="text-muted">Unassigned</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Main Content */}
      <CCard>
        <CCardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <CCardTitle className="mb-0">
              <CIcon icon={cilPhone} className="me-2" />
              Phone Number Management
            </CCardTitle>
            <div className="d-flex gap-2">
              <CButton
                color="secondary"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
              >
                <CIcon icon={cilReload} className={refreshing ? 'spinner-border spinner-border-sm' : ''} />
              </CButton>
            </div>
          </div>
        </CCardHeader>
        <CCardBody>
          {/* Current User Info */}
          <CRow className="mb-3">
            <CCol>
              <div className="d-flex justify-content-between align-items-center text-muted small">
                <span>Current User: <strong>{admin.username}</strong> | Company: <strong>{admin.company_id}</strong></span>
                <span>Current Time: <strong>{CURRENT_DATE_TIME} UTC</strong></span>
              </div>
            </CCol>
          </CRow>

          {/* Filters */}
          <CRow className="mb-4">
            <CCol md={3} className="mb-2">
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilSearch} />
                </CInputGroupText>
                <CFormInput
                  placeholder="Search numbers, employees..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </CInputGroup>
            </CCol>
            <CCol md={2} className="mb-2">
              <CFormSelect
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="unassigned">Unassigned</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </CFormSelect>
            </CCol>
            <CCol md={2} className="mb-2">
              <CFormSelect
                value={filters.payment_status}
                onChange={(e) => handleFilterChange('payment_status', e.target.value)}
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </CFormSelect>
            </CCol>
            <CCol md={2} className="mb-2">
              <CFormSelect
                value={filters.product_code}
                onChange={(e) => handleFilterChange('product_code', e.target.value)}
              >
                <option value="">All Products</option>
                {products.map(product => (
                  <option key={product.code} value={product.code}>
                    {product.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2} className="mb-2">
              <CFormSelect
                value={filters.assigned_employee_id}
                onChange={(e) => handleFilterChange('assigned_employee_id', e.target.value)}
              >
                <option value="">All Employees</option>
                <option value="unassigned">Unassigned</option>
                {employees.map(employee => (
                  <option key={employee.uuid} value={employee.uuid}>
                    {employee.fullName || `${employee.firstname} ${employee.lastname}`}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={1} className="d-flex align-items-end mb-2">
              <CButton
                color="secondary"
                variant="outline"
                onClick={clearFilters}
                disabled={!Object.values(filters).some(f => f)}
                title="Clear filters"
              >
                <CIcon icon={cilX} />
              </CButton>
            </CCol>
          </CRow>

          {/* Progress indicator */}
          {refreshing && <CProgress className="mb-3" animated />}

          {/* Results info */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="text-muted">
              Showing {paginatedNumbers.length} of {filteredNumbers.length} numbers (Total: {stats.total})
            </div>
          </div>

          {/* Table */}
          {paginatedNumbers.length === 0 ? (
            <CAlert color="info" className="text-center">
              <CIcon icon={cilPhone} className="me-2" />
              No phone numbers found. {Object.values(filters).some(f => f) && 'Try adjusting your filters.'}
            </CAlert>
          ) : (
            <>
              <div className="table-responsive">
                <CTable striped hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell width="12%">Phone Number</CTableHeaderCell>
                      <CTableHeaderCell width="15%">Assigned Employee</CTableHeaderCell>
                      <CTableHeaderCell width="12%">Product</CTableHeaderCell>
                      <CTableHeaderCell width="8%">Status</CTableHeaderCell>
                      <CTableHeaderCell width="10%">Payment</CTableHeaderCell>
                      <CTableHeaderCell width="10%">Amount</CTableHeaderCell>
                      <CTableHeaderCell width="10%">Due Date</CTableHeaderCell>
                      <CTableHeaderCell width="10%">Created</CTableHeaderCell>
                      <CTableHeaderCell width="13%">Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {paginatedNumbers.map((number) => (
                      <CTableRow key={number.uuid || number.id}>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            <CIcon icon={cilPhone} className="me-2 text-muted" />
                            <code className="text-primary">{number.phone_number}</code>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {number.assigned_employee_name ? (
                            <div>
                              <CIcon icon={cilUser} className="me-1 text-muted" />
                              {number.assigned_employee_name}
                            </div>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <div>
                            <strong>{number.product?.name || 'Unknown Product'}</strong>
                            <br />
                            <small className="text-muted">{number.product_code}</small>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {getStatusBadge(number.status)}
                        </CTableDataCell>
                        <CTableDataCell>
                          {getPaymentStatusBadge(number.payment_status)}
                          {isOverdue(number.payment_due_date, number.payment_status) && (
                            <div>
                              <CBadge color="danger" className="mt-1">
                                <CIcon icon={cilWarning} className="me-1" />
                                Overdue
                              </CBadge>
                            </div>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <strong>{formatCurrency(number.payment_amount)}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <small>
                            {number.payment_due_date ? new Date(number.payment_due_date).toLocaleDateString() : '-'}
                            {isOverdue(number.payment_due_date, number.payment_status) && (
                              <div className="text-danger small">
                                <CIcon icon={cilWarning} className="me-1" />
                                Overdue
                              </div>
                            )}
                          </small>
                        </CTableDataCell>
                        <CTableDataCell>
                          <small>
                            {new Date(number.created_at).toLocaleDateString()}
                            <br />
                            <span className="text-muted">by {number.created_by}</span>
                          </small>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CDropdown>
                            <CDropdownToggle color="secondary" variant="outline" size="sm">
                              <CIcon icon={cilOptions} />
                            </CDropdownToggle>
                            <CDropdownMenu>
                              <CDropdownItem onClick={() => openAssignModal(number)}>
                                <CIcon icon={cilUserFollow} className="me-2" />
                                Assign/Reassign
                              </CDropdownItem>
                              <CDropdownItem onClick={() => openPaymentModal(number)}>
                                <CIcon icon={cilCreditCard} className="me-2" />
                                Update Payment
                              </CDropdownItem>
                              <CDropdownItem onClick={() => openStatusModal(number)}>
                                <CIcon icon={cilBan} className="me-2" />
                                Change Status
                              </CDropdownItem>
                              <CDropdownItem 
                                className="text-danger" 
                                onClick={() => openDeleteModal(number)}
                              >
                                <CIcon icon={cilTrash} className="me-2" />
                                Delete Number
                              </CDropdownItem>
                            </CDropdownMenu>
                          </CDropdown>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <CPagination>
                    <CPaginationItem
                      disabled={pagination.current === 1}
                      onClick={() => handlePageChange(pagination.current - 1)}
                    >
                      Previous
                    </CPaginationItem>

                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const pageNum = i + Math.max(1, pagination.current - 2);
                      return pageNum <= pagination.pages ? (
                        <CPaginationItem
                          key={pageNum}
                          active={pageNum === pagination.current}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </CPaginationItem>
                      ) : null;
                    })}

                    <CPaginationItem
                      disabled={pagination.current === pagination.pages}
                      onClick={() => handlePageChange(pagination.current + 1)}
                    >
                      Next
                    </CPaginationItem>
                  </CPagination>
                </div>
              )}
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Assignment Modal */}
      <CModal visible={assignModal} onClose={() => setAssignModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilUserFollow} className="me-2" />
            Assign Phone Number
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedNumber && (
            <div>
              <div className="mb-3 p-3 rounded">
                <strong>Phone Number:</strong> <code className="text-primary fs-5">{selectedNumber.phone_number}</code>
                <br />
                <strong>Current Assignment:</strong> {selectedNumber.assigned_employee_name || 'Unassigned'}
                <br />
                <strong>UUID:</strong> {selectedNumber.uuid}
              </div>

              <div className="mb-3">
                <CFormLabel>Assign to Employee</CFormLabel>
                <CFormSelect
                  value={assignData.employeeId}
                  onChange={(e) => setAssignData(prev => ({ ...prev, employeeId: e.target.value }))}
                >
                  <option value="">Unassign (make available)</option>
                  {employees.filter(emp => emp.status === 'active').map(employee => (
                    <option key={employee.uuid} value={employee.uuid}>
                      {employee.fullName || `${employee.firstname} ${employee.lastname}`} - {employee.job_title} ({employee.department})
                    </option>
                  ))}
                </CFormSelect>
              </div>

              <div className="mb-3">
                <CFormLabel>Notes</CFormLabel>
                <CFormTextarea
                  rows={3}
                  placeholder="Optional notes about this assignment..."
                  value={assignData.notes}
                  onChange={(e) => setAssignData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="mb-3 p-2 bg-info bg-opacity-10 rounded">
                <small className="text-muted">
                  <strong>Note:</strong> Assignment will be updated on Employee Server (port 5002) 
                  and audit log will be recorded on Admin Server (port 5001).
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setAssignModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAssignment}>
            Update Assignment
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Payment Modal */}
      <CModal visible={paymentModal} onClose={() => setPaymentModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilCreditCard} className="me-2" />
            Update Payment Status
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedNumber && (
            <div>
              <div className="mb-3 p-3 rounded">
                <strong>Phone Number:</strong> <code className="text-primary fs-5">{selectedNumber.phone_number}</code>
                <br />
                <strong>Product:</strong> {selectedNumber.product?.name}
                <br />
                <strong>Current Status:</strong> {getPaymentStatusBadge(selectedNumber.payment_status)}
                <br />
                <strong>Due Date:</strong> {selectedNumber.payment_due_date ? new Date(selectedNumber.payment_due_date).toLocaleDateString() : 'N/A'}
                <br />
                <strong>UUID:</strong> {selectedNumber.uuid}
              </div>

              <CRow>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>Payment Status</CFormLabel>
                    <CFormSelect
                      value={paymentData.paymentStatus}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </CFormSelect>
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="mb-3">
                    <CFormLabel>Payment Amount (₮)</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>₮</CInputGroupText>
                      <CFormInput
                        type="number"
                        placeholder="25000"
                        value={paymentData.paymentAmount}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                      />
                    </CInputGroup>
                  </div>
                </CCol>
              </CRow>

              <div className="mb-3">
                <CFormLabel>Notes</CFormLabel>
                <CFormTextarea
                  rows={3}
                  placeholder="Optional payment notes..."
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {paymentData.paymentStatus === 'paid' && (
                <div className="alert alert-success">
                  <CIcon icon={cilCheckCircle} className="me-2" />
                  Marking as paid will automatically set the next due date to next month.
                </div>
              )}

              <div className="mb-3 p-2 bg-info bg-opacity-10 rounded">
                <small className="text-muted">
                  <strong>Note:</strong> Payment status will be updated on Employee Server 
                  and audit log will be recorded on Admin Server.
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setPaymentModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handlePaymentUpdate}>
            Update Payment
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Status Modal */}
      <CModal visible={statusModal} onClose={() => setStatusModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilBan} className="me-2" />
            Change Number Status
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedNumber && (
            <div>
              <div className="mb-3 p-3 rounded">
                <strong>Phone Number:</strong> <code className="text-primary fs-5">{selectedNumber.phone_number}</code>
                <br />
                <strong>Current Status:</strong> {getStatusBadge(selectedNumber.status)}
                <br />
                <strong>UUID:</strong> {selectedNumber.uuid}
              </div>

              <div className="mb-3">
                <CFormLabel>New Status</CFormLabel>
                <CFormSelect
                  value={statusData.status}
                  onChange={(e) => setStatusData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                </CFormSelect>
              </div>

              <div className="mb-3">
                <CFormLabel>Reason/Notes</CFormLabel>
                <CFormTextarea
                  rows={3}
                  placeholder="Reason for status change..."
                  value={statusData.notes}
                  onChange={(e) => setStatusData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="mb-3 p-2 bg-warning bg-opacity-10 rounded">
                <small className="text-muted">
                  <strong>Note:</strong> Status change will be recorded on both Employee and Admin servers.
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStatusModal(false)}>
            Cancel
          </CButton>
          <CButton color="warning" onClick={handleStatusUpdate}>
            Change Status
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Modal */}
      <CModal visible={deleteModal} onClose={() => setDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilTrash} className="me-2" />
            Delete Phone Number
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedNumber && (
            <div>
              <div className="alert alert-warning">
                <CIcon icon={cilWarning} className="me-2" />
                <strong>Warning!</strong> This action cannot be undone.
              </div>
              
              <p>Are you sure you want to delete this phone number?</p>
              
              <div className="p-3 rounded">
                <strong>Phone Number:</strong> <code className="text-danger fs-5">{selectedNumber.phone_number}</code>
                <br />
                <strong>Product:</strong> {selectedNumber.product?.name}
                <br />
                <strong>Assigned to:</strong> {selectedNumber.assigned_employee_name || 'Unassigned'}
                <br />
                <strong>Payment Status:</strong> {selectedNumber.payment_status}
                <br />
                <strong>UUID:</strong> {selectedNumber.uuid}
              </div>

              <div className="mt-3 p-2 bg-danger bg-opacity-10 rounded">
                <small className="text-muted">
                  <strong>Note:</strong> Deletion will be processed on Employee Server 
                  and permanently logged on Admin Server for audit purposes.
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDelete}>
            Delete Permanently
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default List;