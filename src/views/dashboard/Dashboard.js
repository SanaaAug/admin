import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  CCard, CCardBody, CCardHeader, CCardTitle,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CContainer, CRow, CCol, CSpinner, CAlert, CFormSelect, CFormInput,
  CButton, CBadge, CPagination, CPaginationItem, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CFormLabel, CInputGroup,
  CInputGroupText, CTooltip, CProgress
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSearch, cilReload, cilInfo, cilUser, cilSettings,
  cilUserPlus, cilPencil, cilTrash, cilCloudDownload,
  cilX, cilFilter
} from '@coreui/icons';
import { useSelector } from 'react-redux';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
const EMPLOYEE_SERVER = 'http://localhost:5002';
var CURRENT_DATE_TIME = new Date().toISOString();
const ITEMS_PER_PAGE = 25;

const ACTION_COLORS = {
  login_success: 'success',
  login_failed: 'danger',
  logout: 'warning',
  create: 'info',
  update: 'primary',
  delete: 'danger',
  view: 'secondary',
  search: 'light',
  create_employee: 'info',
  update_employee: 'primary',
  deactivate_employee: 'warning',
  create_phone_number: 'info',
  update_phone_assignment: 'primary',
  update_phone_payment: 'success',
  update_phone_status: 'warning',
  delete_phone_number: 'danger'
};

const TYPE_COLORS = {
  admin: 'warning',
  employee: 'info',
  phone_number: 'primary',
  system: 'secondary',
  audit: 'dark'
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

const Dashboard = () => {
  // Get current admin from Redux
  const admin = useSelector(state => state.admin);

  // Data state
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    activeAdmins: 0,
    totalEmployees: 0
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    admin_id: '',
    action: '',
    type: '',
    search: ''
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    pages: 0
  });

  // Modal state
  const [detailModal, setDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Derived data
  const actionTypes = useMemo(() => {
    const actions = [...new Set(logs.map(log => log.action))].filter(Boolean);
    return actions.sort();
  }, [logs]);

  const logTypes = useMemo(() => {
    const types = [...new Set(logs.map(log => log.type))].filter(Boolean);
    return types.sort();
  }, [logs]);

  // Load audit logs from admin server
  const loadLogs = useCallback(async () => {
    try {
      setError('');

      const params = {
        page: pagination.current,
        limit: pagination.limit,
        ...(filters.admin_id && { admin_id: filters.admin_id }),
        ...(filters.action && { action: filters.action }),
        ...(filters.type && { type: filters.type })
      };

      const response = await axios.get(`${ADMIN_SERVER}/api/audit/${admin.role !== 'systemadmin' ? admin.company_id : 'system'}`, {
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        },
        params
      });

      setLogs(response.data.logs || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));

    } catch (err) {
      console.error('Error loading logs:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        localStorage.removeItem('tokenExpiresAt');
      } else {
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.message || 
                            'Failed to load audit logs from Admin Server';
        setError(errorMessage);
      }
    }
  }, [pagination.current, pagination.limit, filters]);

  // Load admins from admin server
  const loadAdmins = useCallback(async () => {
    try {
      const response = await axios.get(`${ADMIN_SERVER}/api/admin/users`, {
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders() 
        }
      });

      setAdmins(response.data.admins || []);
    } catch (err) {
      console.error('Error loading admins:', err);
      // Non-critical error, don't show to user
    }
  }, []);

  // Load dashboard statistics from both servers
  const loadStats = useCallback(async () => {
    try {
      // Load employees data from employee server
      const employeesRes = await axios.get(
        `${EMPLOYEE_SERVER}/user/employees`,
        {
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders() 
          }
        }
      );

      const today = new Date(CURRENT_DATE_TIME).toDateString();
      const todayLogs = logs.filter(log => 
        new Date(log.timestamp).toDateString() === today
      ).length;

      const uniqueAdmins = [...new Set(logs.map(log => log.admin_id))].filter(Boolean).length;

      setStats({
        totalLogs: logs.length,
        todayLogs,
        activeAdmins: uniqueAdmins,
        totalEmployees: employeesRes.data.emps?.length || 0
      });

    } catch (err) {
      console.error('Error loading stats:', err);
      // Try to set partial stats if employee server fails
      const today = new Date(CURRENT_DATE_TIME).toDateString();
      const todayLogs = logs.filter(log => 
        new Date(log.timestamp).toDateString() === today
      ).length;

      const uniqueAdmins = [...new Set(logs.map(log => log.admin_id))].filter(Boolean).length;

      setStats({
        totalLogs: logs.length,
        todayLogs,
        activeAdmins: uniqueAdmins,
        totalEmployees: 0 // Will show 0 if employee server is unreachable
      });
    }
  }, [logs]);

  // Apply client-side search filter (since server doesn't support it yet)
  const filteredLogs = useMemo(() => {
    if (!filters.search) return logs;
    
    const searchTerm = filters.search.toLowerCase();
    return logs.filter(log => {
      const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
      return details.toLowerCase().includes(searchTerm) ||
             log.ip_address?.toLowerCase().includes(searchTerm) ||
             log.action?.toLowerCase().includes(searchTerm) ||
             log.type?.toLowerCase().includes(searchTerm);
    });
  }, [logs, filters.search]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadLogs(), loadAdmins()]);
      setLoading(false);
    };

    loadData();
  }, [loadLogs, loadAdmins]);

  // Load stats when logs change
  useEffect(() => {
    if (logs.length > 0) {
      loadStats();
    }
  }, [logs, loadStats]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    if (field !== 'search') { // Don't reset page for search as it's client-side
      setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      admin_id: '',
      action: '',
      type: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLogs(), loadAdmins(), loadStats()]);
    setRefreshing(false);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  // Show log details
  const showLogDetails = (log) => {
    setSelectedLog(log);
    setDetailModal(true);
  };

  // Export logs (enhanced implementation)
  const exportLogs = () => {
    const logsToExport = filters.search ? filteredLogs : logs;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Admin,Action,Type,Details,IP Address,Timestamp\n"
      + logsToExport.map(log => {
          const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
          const cleanDetails = details.replace(/"/g, '""'); // Escape quotes for CSV
          return `${log.id},"${getAdminName(log.admin_id)}","${log.action}","${log.type}","${cleanDetails}","${log.ip_address || ''}","${log.timestamp}"`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date(CURRENT_DATE_TIME).toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper functions
  const getAdminName = (adminId) => {
    if (adminId === 'anonymous' || adminId === 'system' || adminId === 'unknown') return adminId;
    const admin = admins.find(a => a.id == adminId); // Use == for type flexibility
    return admin ? admin.username : `Admin ${adminId}`;
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .slice(0, 3) // Show only first 3 entries to prevent overflow
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ') + (Object.keys(parsed).length > 3 ? '...' : '');
      }
      return details.toString().substring(0, 100) + (details.length > 100 ? '...' : '');
    } catch {
      return details.toString().substring(0, 100) + (details.length > 100 ? '...' : '');
    }
  };

  const getActionBadge = (action) => (
    <CBadge color={ACTION_COLORS[action] || 'secondary'}>
      {action.replace(/_/g, ' ').toUpperCase()}
    </CBadge>
  );

  const getTypeBadge = (type) => (
    <CBadge color={TYPE_COLORS[type] || 'secondary'} className="me-1">
      {type.toUpperCase()}
    </CBadge>
  );

  if (loading) {
    return (
      <CContainer className="mt-4">
        <div className="text-center py-5">
          <CSpinner size="lg" />
          <div className="mt-3">Loading dashboard from Admin Server...</div>
          <small className="text-muted">Connecting to localhost:5001</small>
        </div>
      </CContainer>
    );
  }

  return (
    <CContainer className="mt-4">
      {/* Error Alert */}
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')} className="mb-4">
          {error}
        </CAlert>
      )}

      {/* Server Status Info */}
      {/* <div className="mb-4 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.1)', border: '1px solid rgba(13, 202, 240, 0.2)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">Admin Server:</small>
            <strong className="ms-2">localhost:5001</strong>
          </div>
          <div>
            <small className="text-muted">Employee Server:</small>
            <strong className="ms-2">localhost:5002</strong>
          </div>
        </div>
        <div className="mt-1">
          <small className="text-muted">Audit logs from Admin Server, employee stats from Employee Server</small>
        </div>
      </div> */}

      {/* Current User Info */}
      {/* <div className="mb-4 p-3 rounded" style={{ background: 'rgba(25, 135, 84, 0.1)', border: '1px solid rgba(25, 135, 84, 0.2)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">Current User:</small>
            <strong className="ms-2">{admin.username}</strong>
          </div>
          <div>
            <small className="text-muted">Current Time:</small>
            <strong className="ms-2">{CURRENT_DATE_TIME} UTC</strong>
          </div>
        </div>
        <div className="mt-1">
          <small className="text-muted">Company: {admin.company_id}</small>
        </div>
      </div> */}

      {/* Statistics Cards */}
      <CRow className="mb-4">
        <CCol sm={6} md={3}>
          <CCard className="text-center border-primary">
            <CCardBody>
              <div className="text-primary fs-2 fw-bold">{stats.totalLogs}</div>
              <div className="text-muted">Total Logs</div>
              <small className="text-muted">Admin Server</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-success">
            <CCardBody>
              <div className="text-success fs-2 fw-bold">{stats.todayLogs}</div>
              <div className="text-muted">Today's Activity</div>
              <small className="text-muted">Since midnight</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-info">
            <CCardBody>
              <div className="text-info fs-2 fw-bold">{stats.activeAdmins}</div>
              <div className="text-muted">Active Admins</div>
              <small className="text-muted">Unique admin IDs</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} md={3}>
          <CCard className="text-center border-warning">
            <CCardBody>
              <div className="text-warning fs-2 fw-bold">{stats.totalEmployees}</div>
              <div className="text-muted">Total Employees</div>
              <small className="text-muted">Employee Server</small>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Main Content */}
      <CRow>
        <CCol>
          <CCard>
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <CCardTitle className="mb-0">
                  <CIcon icon={cilSettings} className="me-2" />
                  Admin Audit Logs
                </CCardTitle>
                <div className="d-flex gap-2">
                  <CTooltip content="Export logs to CSV">
                    <CButton
                      color="info"
                      variant="outline"
                      size="sm"
                      onClick={exportLogs}
                      disabled={filteredLogs.length === 0}
                    >
                      <CIcon icon={cilCloudDownload} />
                    </CButton>
                  </CTooltip>
                  <CTooltip content="Refresh data from servers">
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
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
              {/* Filters */}
              <CRow className="mb-4">
                <CCol md={3} className="mb-2">
                  <CFormLabel>Admin</CFormLabel>
                  <CFormSelect 
                    value={filters.admin_id} 
                    onChange={(e) => handleFilterChange('admin_id', e.target.value)}
                  >
                    <option value="">All Admins</option>
                    {admins.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.username} ({admin.role})
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={2} className="mb-2">
                  <CFormLabel>Action</CFormLabel>
                  <CFormSelect 
                    value={filters.action} 
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    <option value="">All Actions</option>
                    {actionTypes.map(action => (
                      <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={2} className="mb-2">
                  <CFormLabel>Type</CFormLabel>
                  <CFormSelect 
                    value={filters.type} 
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">All Types</option>
                    {logTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4} className="mb-2">
                  <CFormLabel>Search <small className="text-muted">(client-side)</small></CFormLabel>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search details, IP address, action, type..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={1} className="d-flex align-items-end mb-2">
                  <CTooltip content="Clear all filters">
                    <CButton 
                      color="secondary" 
                      variant="outline"
                      onClick={clearFilters}
                      disabled={!Object.values(filters).some(f => f)}
                    >
                      <CIcon icon={cilX} />
                    </CButton>
                  </CTooltip>
                </CCol>
              </CRow>

              {/* Progress indicator for refreshing */}
              {refreshing && (
                <CProgress className="mb-3" animated />
              )}

              {/* Results info */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted">
                  Showing {filteredLogs.length} of {pagination.total} logs
                  {filters.search && ` (filtered from ${logs.length} loaded logs)`}
                </div>
                {Object.values(filters).some(f => f) && (
                  <CBadge color="info">
                    <CIcon icon={cilFilter} className="me-1" />
                    Filters Applied
                  </CBadge>
                )}
              </div>

              {/* Table */}
              {filteredLogs.length === 0 ? (
                <CAlert color="info" className="text-center">
                  <CIcon icon={cilInfo} className="me-2" />
                  No audit logs found. {Object.values(filters).some(f => f) && 'Try adjusting your filters.'}
                </CAlert>
              ) : (
                <>
                  <div className="table-responsive">
                    <CTable striped hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell width="5%">#</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Admin</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Action</CTableHeaderCell>
                          <CTableHeaderCell width="10%">Type</CTableHeaderCell>
                          <CTableHeaderCell width="30%">Details</CTableHeaderCell>
                          <CTableHeaderCell width="15%">IP Address</CTableHeaderCell>
                          <CTableHeaderCell width="15%">Timestamp</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {filteredLogs.map((log, idx) => (
                          <CTableRow 
                            key={log.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => showLogDetails(log)}
                            title="Click to view details"
                          >
                            <CTableDataCell>
                              {(pagination.current - 1) * pagination.limit + idx + 1}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex align-items-center">
                                <CIcon icon={cilUser} className="me-2 text-muted" />
                                {getAdminName(log.admin_id)}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              {getActionBadge(log.action)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {getTypeBadge(log.type)}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {formatDetails(log.details)}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <code className="text-muted">{log.ip_address || '-'}</code>
                            </CTableDataCell>
                            <CTableDataCell>
                              <small>
                                {log.timestamp 
                                  ? new Date(log.timestamp).toLocaleString()
                                  : '-'
                                }
                              </small>
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
        </CCol>
      </CRow>

      {/* Log Details Modal */}
      <CModal visible={detailModal} onClose={() => setDetailModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Audit Log Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedLog && (
            <div>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Log ID:</strong></CCol>
                <CCol sm={9}>{selectedLog.id}</CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Admin:</strong></CCol>
                <CCol sm={9}>
                  {getAdminName(selectedLog.admin_id)}
                  <small className="text-muted ms-2">(ID: {selectedLog.admin_id})</small>
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Action:</strong></CCol>
                <CCol sm={9}>{getActionBadge(selectedLog.action)}</CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Type:</strong></CCol>
                <CCol sm={9}>{getTypeBadge(selectedLog.type)}</CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>IP Address:</strong></CCol>
                <CCol sm={9}><code>{selectedLog.ip_address || 'N/A'}</code></CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Timestamp:</strong></CCol>
                <CCol sm={9}>
                  {selectedLog.timestamp 
                    ? new Date(selectedLog.timestamp).toLocaleString()
                    : 'N/A'
                  }
                </CCol>
              </CRow>
              <CRow className="mb-3">
                <CCol sm={3}><strong>Details:</strong></CCol>
                <CCol sm={9}>
                  <pre style={{ 
                    //background: '#f8f9fa', 
                    padding: '15px', 
                    borderRadius: '6px',
                    fontSize: '12px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid #dee2e6'
                  }}>
                    {selectedLog.details 
                      ? (typeof selectedLog.details === 'string' 
                          ? (selectedLog.details.startsWith('{') || selectedLog.details.startsWith('[')
                              ? JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                              : selectedLog.details
                            )
                          : JSON.stringify(selectedLog.details, null, 2)
                        )
                      : 'No additional details'
                    }
                  </pre>
                </CCol>
              </CRow>
              <div className="mt-3 p-2 bg-info bg-opacity-10 rounded">
                <small className="text-muted">
                  <strong>Source:</strong> Admin Server (localhost:5001) • 
                  <strong> Recorded:</strong> {selectedLog.timestamp ? new Date(selectedLog.timestamp).toISOString() : 'Unknown'}
                </small>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Dashboard;