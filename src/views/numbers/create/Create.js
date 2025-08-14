import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle,
  CForm, CFormInput, CFormSelect, CFormLabel, CFormTextarea,
  CButton, CSpinner, CAlert, CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPhone, cilUser, cilDollar, cilInfo } from '@coreui/icons';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
const EMPLOYEE_SERVER = 'http://localhost:5002';
var CURRENT_DATE_TIME = new Date().toISOString();

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  // Fallback to basic auth if no token
  return { Authorization: 'Basic YWRtaW46YWRtaW5fcGFzc3dvcmQ=' };
};

const Create = () => {
  // Get current admin from Redux
  const admin = useSelector(state => state.admin);

  // Form state
  const [formData, setFormData] = useState({
    phoneNumber: '',
    productCode: '',
    assignedEmployeeId: '',
    notes: ''
  });

  // Data state
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Modal state
  const [previewModal, setPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Log activity to admin server
  const logActivity = async (action, details) => {
    try {
      await axios.post(
        `${ADMIN_SERVER}/api/admin/activity`,
        {
          action,
          details,
          timestamp: new Date().toISOString(),
          user: admin?.username,
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

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setError('');

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

      const employeeData = employeesRes.data.emps || [];
      const productData = productsRes.data.products || [];

      setEmployees(employeeData);
      setProducts(productData);

      // Log successful data load
      // logActivity('load_phone_form_data', {
      //   company_id: admin.company_id,
      //   employee_count: employeeData.length,
      //   product_count: productData.length,
      //   success: true
      // });

    } catch (err) {
      console.error('Error loading data:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load required data. Please refresh the page.';
      setError(errorMessage);
      
      // Log failed data load
      // logActivity('load_phone_form_data_failed', {
      //   company_id: admin.company_id,
      //   error: errorMessage,
      //   success: false
      // });
    } finally {
      setLoadingData(false);
    }
  }, [admin.company_id, admin.username]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Form handlers
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{8,}$/.test(formData.phoneNumber.trim())) {
      errors.phoneNumber = 'Invalid phone number format';
    }

    // Product validation
    if (!formData.productCode) {
      errors.productCode = 'Product selection is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) return;

    const selectedProduct = products.find(p => p.code === formData.productCode);
    const selectedEmployee = employees.find(e => e.uuid === formData.assignedEmployeeId);

    setPreviewData({
      phoneNumber: formData.phoneNumber.trim(),
      product: selectedProduct,
      employee: selectedEmployee,
      notes: formData.notes.trim(),
      createdBy: admin.username,
      monthlyFee: selectedProduct?.monthly_fee || 0
    });
    setPreviewModal(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Create phone number on employee server
      const response = await axios.post(
        `${EMPLOYEE_SERVER}/internal/company/employee/number`,
        {
          phone_number: formData.phoneNumber.trim(),
          created_by: admin.username, // Use admin username as created_by
          product_code: formData.productCode,
          assigned_employee_id: formData.assignedEmployeeId || null
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );

      const selectedProduct = products.find(p => p.code === formData.productCode);
      const selectedEmployee = employees.find(e => e.uuid === formData.assignedEmployeeId);

      // Log successful phone number creation to admin server
      logActivity('create', {
        phone_number: formData.phoneNumber.trim(),
        product_code: formData.productCode,
        product_name: selectedProduct?.name,
        monthly_fee: selectedProduct?.monthly_fee,
        assigned_employee_id: formData.assignedEmployeeId,
        assigned_employee_name: selectedEmployee ? 
          (selectedEmployee.fullName || `${selectedEmployee.firstname} ${selectedEmployee.lastname}`) : null,
        company_id: admin.company_id,
        created_by: admin.username,
        notes: formData.notes.trim(),
        success: true,
        response_data: response.data
      });

      setSuccess(`Phone number ${formData.phoneNumber} created successfully!`);
      setPreviewModal(false);
      
      // Reset form
      setFormData({
        phoneNumber: '',
        productCode: '',
        assignedEmployeeId: '',
        notes: ''
      });

    } catch (err) {
      console.error('Error creating phone number:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to create phone number';
      setError(errorMessage);
      
      // Log failed phone number creation to admin server
      logActivity('create_phone_number_failed', {
        phone_number: formData.phoneNumber.trim(),
        product_code: formData.productCode,
        assigned_employee_id: formData.assignedEmployeeId,
        company_id: admin.company_id,
        created_by: admin.username,
        error: errorMessage,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phoneNumber: '',
      productCode: '',
      assignedEmployeeId: '',
      notes: ''
    });
    setFormErrors({});
  };

  if (loadingData) {
    return (
      <CContainer className="mt-4">
        <div className="text-center py-5">
          <CSpinner size="lg" />
          <div className="mt-3">Loading form data from Employee Server...</div>
          <small className="text-muted">Connecting to localhost:5002</small>
        </div>
      </CContainer>
    );
  }

  return (
    <CContainer className="mt-4">
      <CRow>
        <CCol lg={8} className="mx-auto">
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
              <small className="text-muted">Operations go to Employee Server, audit logs to Admin Server</small>
            </div>
          </div> */}

          {/* Current User Info */}
          <CRow className="mb-3">
            <CCol>
              <div className="d-flex justify-content-between align-items-center text-muted small">
                <span>Current User: <strong>{admin.username}</strong> | Company: <strong>{admin.company_id}</strong></span>
                <span>Current Time: <strong>{CURRENT_DATE_TIME} UTC</strong></span>
              </div>
            </CCol>
          </CRow>

          {/* Main Form */}
          <CCard>
            <CCardHeader>
              <CCardTitle className="mb-0">
                <CIcon icon={cilPhone} className="me-2" />
                Create New Phone Number
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <CForm>
                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="phoneNumber">
                        Phone Number *
                      </CFormLabel>
                      <CInputGroup>
                        <CInputGroupText>
                          <CIcon icon={cilPhone} />
                        </CInputGroupText>
                        <CFormInput
                          id="phoneNumber"
                          placeholder="60006315 or 88001234"
                          value={formData.phoneNumber}
                          onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                          invalid={!!formErrors.phoneNumber}
                          feedback={formErrors.phoneNumber}
                        />
                      </CInputGroup>
                      <small className="text-muted">
                        Enter phone number (8-digit format recommended)
                      </small>
                    </div>
                  </CCol>

                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="productCode">
                        Product Plan *
                      </CFormLabel>
                      <CFormSelect
                        id="productCode"
                        value={formData.productCode}
                        onChange={(e) => handleFormChange('productCode', e.target.value)}
                        invalid={!!formErrors.productCode}
                        feedback={formErrors.productCode}
                      >
                        <option value="">Select product plan</option>
                        {products.map(product => (
                          <option key={product.code} value={product.code}>
                            {product.name} - ₮{product.monthly_fee.toLocaleString()}/month
                          </option>
                        ))}
                      </CFormSelect>
                      {formData.productCode && (
                        <small className="text-info">
                          <CIcon icon={cilInfo} className="me-1" />
                          {products.find(p => p.code === formData.productCode)?.description}
                        </small>
                      )}
                    </div>
                  </CCol>
                </CRow>

                <CRow>
                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="assignedEmployeeId">
                        Assign to Employee
                      </CFormLabel>
                      <CFormSelect
                        id="assignedEmployeeId"
                        value={formData.assignedEmployeeId}
                        onChange={(e) => handleFormChange('assignedEmployeeId', e.target.value)}
                      >
                        <option value="">No assignment (available for later)</option>
                        {employees
                          .filter(emp => emp.status === 'active')
                          .map(employee => (
                          <option key={employee.uuid} value={employee.uuid}>
                            {employee.fullName || `${employee.firstname} ${employee.lastname}`} - {employee.job_title} ({employee.department})
                          </option>
                        ))}
                      </CFormSelect>
                      <small className="text-muted">
                        Optional: You can assign this later. Showing {employees.filter(emp => emp.status === 'active').length} active employees.
                      </small>
                    </div>
                  </CCol>

                  <CCol md={6}>
                    <div className="mb-3">
                      <CFormLabel>Created By</CFormLabel>
                      <CFormInput
                        value={admin.username}
                        disabled
                      />
                      <small className="text-muted">
                        Current logged-in user
                      </small>
                    </div>
                  </CCol>
                </CRow>

                <div className="mb-4">
                  <CFormLabel htmlFor="notes">
                    Notes
                  </CFormLabel>
                  <CFormTextarea
                    id="notes"
                    rows={3}
                    placeholder="Optional notes about this phone number..."
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Reset Form
                  </CButton>
                  
                  <div className="d-flex gap-2">
                    <CButton
                      color="info"
                      variant="outline"
                      onClick={handlePreview}
                      disabled={loading}
                    >
                      Preview
                    </CButton>
                    <CButton
                      color="primary"
                      onClick={handlePreview}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilPhone} className="me-2" />
                          Create Number
                        </>
                      )}
                    </CButton>
                  </div>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Preview Modal */}
      <CModal visible={previewModal} onClose={() => setPreviewModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Confirm Phone Number Creation</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {previewData && (
            <div>
              <h6 className="mb-3">Please review the details:</h6>
              
              <CRow className="mb-3">
                <CCol sm={4}><strong>Phone Number:</strong></CCol>
                <CCol sm={8}>
                  <code className="text-primary fs-5">{previewData.phoneNumber}</code>
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol sm={4}><strong>Product Plan:</strong></CCol>
                <CCol sm={8}>
                  <div>
                    <strong>{previewData.product?.name}</strong>
                    <br />
                    <small className="text-muted">{previewData.product?.description}</small>
                    <br />
                    <span className="text-success">
                      <CIcon icon={cilDollar} />
                      ₮{previewData.monthlyFee.toLocaleString()} per month
                    </span>
                  </div>
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol sm={4}><strong>Assigned Employee:</strong></CCol>
                <CCol sm={8}>
                  {previewData.employee ? (
                    <div>
                      <CIcon icon={cilUser} className="me-1" />
                      {previewData.employee.fullName || `${previewData.employee.firstname} ${previewData.employee.lastname}`}
                      <br />
                      <small className="text-muted">
                        {previewData.employee.job_title} - {previewData.employee.department}
                      </small>
                      <br />
                      <small className="text-info">UUID: {previewData.employee.uuid}</small>
                    </div>
                  ) : (
                    <span className="text-muted">Not assigned (available for later assignment)</span>
                  )}
                </CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol sm={4}><strong>Created By:</strong></CCol>
                <CCol sm={8}>{previewData.createdBy}</CCol>
              </CRow>

              <CRow className="mb-3">
                <CCol sm={4}><strong>Company:</strong></CCol>
                <CCol sm={8}>
                  <span className="text-muted">{admin.company_id}</span>
                </CCol>
              </CRow>

              {previewData.notes && (
                <CRow className="mb-3">
                  <CCol sm={4}><strong>Notes:</strong></CCol>
                  <CCol sm={8}>
                    <div className="bg-light p-2 rounded">
                      {previewData.notes}
                    </div>
                  </CCol>
                </CRow>
              )}

              <div className="bg-info bg-opacity-10 border border-info rounded p-3 mt-3">
                <h6 className="text-info mb-2">
                  <CIcon icon={cilInfo} className="me-1" />
                  What happens next?
                </h6>
                <ul className="mb-0 small">
                  <li>Phone number will be created with <strong>Active</strong> status on Employee Server</li>
                  <li>Payment status will be set to <strong>Pending</strong></li>
                  <li>Monthly fee: ₮{previewData.monthlyFee.toLocaleString()}</li>
                  <li>First payment will be due next month</li>
                  {previewData.employee && <li>Number will be assigned to {previewData.employee.fullName || `${previewData.employee.firstname} ${previewData.employee.lastname}`}</li>}
                  <li>Created by: {previewData.createdBy} at {CURRENT_DATE_TIME} UTC</li>
                  <li>Audit log will be recorded on Admin Server</li>
                </ul>
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setPreviewModal(false)}
            disabled={loading}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating on Employee Server...
              </>
            ) : (
              'Confirm & Create'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Create;