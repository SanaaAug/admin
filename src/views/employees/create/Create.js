import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardTitle, CCardBody,
  CForm, CFormInput, CFormSelect, CFormLabel, CButton, CAlert,
  CSpinner, CProgress, CModal, CModalHeader, CModalTitle, CModalBody,
  CModalFooter, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CBadge, CFormTextarea, CTooltip
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilUserPlus, cilCheckCircle, cilXCircle } from '@coreui/icons';
import { useSelector } from 'react-redux';

// Constants
const ADMIN_SERVER = 'http://localhost:5001';
const EMPLOYEE_SERVER = 'http://localhost:5002';

const FORM_FIELDS = {
  job_title: { label: 'Job Title', type: 'text', required: true, placeholder: 'e.g., Software Engineer' },
  department: { label: 'Department', type: 'select', required: true, placeholder: 'Select department' },
  firstname: { label: 'First Name', type: 'text', required: true, placeholder: 'Enter first name' },
  lastname: { label: 'Last Name', type: 'text', required: true, placeholder: 'Enter last name' },
  email: { label: 'Email Address', type: 'email', required: true, placeholder: 'employee@company.com' },
  phoneNumber: { label: 'Phone Number', type: 'tel', required: true, placeholder: '+976-12345678' },
  registerNumber: { label: 'Register Number', type: 'text', required: true, placeholder: 'REG-XXXX' }
};

const DEPARTMENTS = [
  'Operations',
  'Sales',
  'Marketing', 
  'IT',
  'HR',
  'Finance',
  'Customer Service',
  'Warehouse',
  'Management'
];

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
  // Get current admin info from Redux store
  const admin = useSelector(state => state.admin);
  
  // Form state
  const [form, setForm] = useState({
    job_title: '',
    department: '',
    phoneNumber: '',
    firstname: '',
    lastname: '',
    registerNumber: '',
    email: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [formErrors, setFormErrors] = useState({});

  // Bulk upload state
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState({ success: 0, failed: 0, errors: [] });

  // Memoized validation rules
  const validationRules = useMemo(() => ({
    job_title: { required: true, minLength: 2 },
    department: { required: true },
    firstname: { required: true, minLength: 2, pattern: /^[a-zA-Z\s\u0400-\u04FF]+$/ }, // Added Cyrillic support
    lastname: { required: true, minLength: 2, pattern: /^[a-zA-Z\s\u0400-\u04FF]+$/ }, // Added Cyrillic support
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phoneNumber: { required: true, pattern: /^\+?[\d\s\-\(\)]{8,}$/ },
    registerNumber: { required: true, minLength: 4 }
  }), []);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = form[field]?.toString().trim() || '';

      if (rules.required && !value) {
        errors[field] = `${FORM_FIELDS[field].label} is required`;
        return;
      }

      if (value && rules.minLength && value.length < rules.minLength) {
        errors[field] = `${FORM_FIELDS[field].label} must be at least ${rules.minLength} characters`;
        return;
      }

      if (value && rules.pattern && !rules.pattern.test(value)) {
        switch (field) {
          case 'email':
            errors[field] = 'Please enter a valid email address';
            break;
          case 'phoneNumber':
            errors[field] = 'Please enter a valid phone number';
            break;
          case 'firstname':
          case 'lastname':
            errors[field] = 'Name should contain only letters and spaces';
            break;
          default:
            errors[field] = `Invalid ${FORM_FIELDS[field].label.toLowerCase()} format`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, validationRules]);

  // Auto-clear status messages
  React.useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Handle form field changes
  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Log activity to admin server
  const logActivity = async (action, details) => {
    try {
      // Since the admin server doesn't have a specific logging endpoint exposed,
      // we'll make a request that would trigger the audit logging internally
      await axios.post(
        `${ADMIN_SERVER}/api/admin/activity`, // This would need to be added to admin server
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

  // Add single employee
  const addEmployee = async (employeeData) => {
    try {
      // Create employee on employee server
      const response = await axios.post(
        `${EMPLOYEE_SERVER}/internal/company/employee`,
        {
          company_id: admin?.company_id || 'e1b21e25-0c31-4a1e-8d8e-f658597e7420',
          job_title: employeeData.job_title,
          department: employeeData.department,
          created_by: admin?.username || 'SanaaAug',
          objects: [
            { object_type: "phoneNumber1", object_value: employeeData.phoneNumber },
            { object_type: "firstname", object_value: employeeData.firstname },
            { object_type: "lastname", object_value: employeeData.lastname },
            { object_type: "registerNumber", object_value: employeeData.registerNumber },
            { object_type: "email", object_value: employeeData.email }
          ]
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          }
        }
      );

      // Log the activity (fire and forget)
      logActivity('create', {
        employee_name: `${employeeData.firstname} ${employeeData.lastname}`,
        department: employeeData.department,
        job_title: employeeData.job_title,
        company_id: admin?.company_id,
        success: true
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Employee creation failed:', error);
      
      // Log the failed attempt
      logActivity('create_employee_failed', {
        employee_name: `${employeeData.firstname} ${employeeData.lastname}`,
        error: error.response?.data?.error || error.message,
        company_id: admin?.company_id,
        success: false
      });

      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Unknown error';
      return { success: false, error: errorMessage, data: employeeData };
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setStatus({ type: 'danger', message: 'Please fix the validation errors before submitting.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const result = await addEmployee(form);
      
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: `Employee ${form.firstname} ${form.lastname} added successfully!` 
        });
        
        // Reset form
        setForm({
          job_title: '',
          department: '',
          phoneNumber: '',
          firstname: '',
          lastname: '',
          registerNumber: '',
          email: ''
        });
      } else {
        setStatus({ type: 'danger', message: result.error });
      }
    } catch (error) {
      setStatus({ type: 'danger', message: 'Unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setStatus({ type: 'danger', message: 'Please select a valid Excel file (.xlsx or .xls)' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'danger', message: 'File size must be less than 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          setStatus({ type: 'warning', message: 'The Excel file appears to be empty' });
          return;
        }

        if (rows.length > 100) {
          setStatus({ type: 'warning', message: 'Maximum 100 employees can be uploaded at once' });
          return;
        }

        setBulkData(rows);
        setBulkModal(true);
      } catch (error) {
        setStatus({ type: 'danger', message: 'Failed to read Excel file. Please check the format.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    setBulkLoading(true);
    setBulkProgress({ current: 0, total: bulkData.length });
    setBulkResults({ success: 0, failed: 0, errors: [] });

    // Log bulk upload start
    logActivity('upload', {
      total_employees: bulkData.length,
      company_id: admin?.company_id,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < bulkData.length; i++) {
      const row = bulkData[i];
      setBulkProgress({ current: i + 1, total: bulkData.length });

      const result = await addEmployee({
        ...row,
        created_by: admin?.username || 'SanaaAug'
      });

      if (result.success) {
        setBulkResults(prev => ({ ...prev, success: prev.success + 1 }));
      } else {
        setBulkResults(prev => ({
          ...prev,
          failed: prev.failed + 1,
          errors: [...prev.errors, { row: i + 1, error: result.error, data: row }]
        }));
      }

      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Log bulk upload completion
    logActivity('complete', {
      total_employees: bulkData.length,
      successful: bulkResults.success,
      failed: bulkResults.failed,
      company_id: admin?.company_id,
      timestamp: new Date().toISOString()
    });

    setBulkLoading(false);
  };

  const closeBulkModal = () => {
    setBulkModal(false);
    setBulkData([]);
    setBulkProgress({ current: 0, total: 0 });
    setBulkResults({ success: 0, failed: 0, errors: [] });
    
    if (bulkResults.success > 0) {
      setStatus({ 
        type: 'success', 
        message: `Bulk upload completed! ${bulkResults.success} employees added, ${bulkResults.failed} failed.` 
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [{
      job_title: 'Software Engineer',
      department: 'IT',
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@company.com',
      phoneNumber: '+976-88112233',
      registerNumber: 'REG-1001'
    }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Template');
    XLSX.writeFile(wb, 'employee_template.xlsx');
  };

  return (
    <CContainer className="mt-4">
      <CRow>
        <CCol lg={8} className="mx-auto">
          {/* Status Messages */}
          {status.message && (
            <CAlert 
              color={status.type} 
              dismissible 
              onClose={() => setStatus({ type: '', message: '' })}
              className="mb-4"
            >
              {status.message}
            </CAlert>
          )}

          {/* Current User Info */}
          {/* <div className="mb-4 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.1)', border: '1px solid rgba(13, 202, 240, 0.2)' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">Current User:</small>
                <strong className="ms-2">{admin?.username || 'SanaaAug'}</strong>
              </div>
              <div>
                <small className="text-muted">Time:</small>
                <strong className="ms-2">2025-08-12 10:33:10 UTC</strong>
              </div>
            </div>
            <div className="mt-1">
              <small className="text-muted">Company:</small>
              <strong className="ms-2">{admin?.company_id || 'e1b21e25-0c31-4a1e-8d8e-f658597e7420'}</strong>
            </div>
          </div> */}

          {/* Single Employee Form */}
          <CCard className="mb-4">
            <CCardHeader>
              <CCardTitle className="mb-0">
                <CIcon icon={cilUserPlus} className="me-2" />
                Add New Employee
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit}>
                <CRow>
                  {Object.entries(FORM_FIELDS).map(([field, config]) => (
                    <CCol md={6} key={field} className="mb-3">
                      <CFormLabel htmlFor={field}>
                        {config.label}
                        {config.required && <span className="text-danger ms-1">*</span>}
                      </CFormLabel>
                      
                      {config.type === 'select' && field === 'department' ? (
                        <CFormSelect
                          id={field}
                          value={form[field]}
                          onChange={(e) => handleFormChange(field, e.target.value)}
                          invalid={!!formErrors[field]}
                          feedback={formErrors[field]}
                        >
                          <option value="">Select department</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </CFormSelect>
                      ) : (
                        <CFormInput
                          id={field}
                          type={config.type}
                          value={form[field]}
                          onChange={(e) => handleFormChange(field, e.target.value)}
                          placeholder={config.placeholder}
                          invalid={!!formErrors[field]}
                          feedback={formErrors[field]}
                        />
                      )}
                    </CCol>
                  ))}
                </CRow>
                
                <div className="d-flex justify-content-end mt-3">
                  <CButton 
                    type="submit" 
                    color="primary" 
                    disabled={loading}
                    className="px-4"
                  >
                    {loading ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Adding to Employee Server...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilUserPlus} className="me-2" />
                        Add Employee
                      </>
                    )}
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>

          {/* Bulk Upload Section */}
          <CCard>
            <CCardHeader>
              <CCardTitle className="mb-0">
                <CIcon icon={cilCloudUpload} className="me-2" />
                Bulk Upload via Excel
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <p className="text-muted mb-3">
                  Upload multiple employees at once using an Excel file. Maximum 100 employees per upload.
                  <br />
                  <small><strong>Employee Server:</strong> localhost:5002 | <strong>Admin Server:</strong> localhost:5001</small>
                </p>
                
                <div className="mb-3">
                  <CButton 
                    color="info" 
                    variant="outline" 
                    onClick={downloadTemplate}
                    className="me-3"
                  >
                    Download Template
                  </CButton>
                  <small className="text-muted">
                    Download a sample Excel file to see the required format.
                  </small>
                </div>

                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleFileUpload}
                  className="form-control"
                  disabled={bulkLoading}
                />
              </div>
              
              <div className="text-muted small">
                <strong>Supported columns:</strong> job_title, department, firstname, lastname, email, phoneNumber, registerNumber
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Bulk Upload Modal */}
      <CModal visible={bulkModal} onClose={closeBulkModal} size="lg" backdrop="static">
        <CModalHeader>
          <CModalTitle>Bulk Upload Preview</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {!bulkLoading && bulkResults.success === 0 && bulkResults.failed === 0 && (
            <>
              <div className="mb-3">
                <strong>Found {bulkData.length} employees to upload:</strong>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <CTable striped hover responsive size="sm">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Email</CTableHeaderCell>
                      <CTableHeaderCell>Department</CTableHeaderCell>
                      <CTableHeaderCell>Job Title</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {bulkData.slice(0, 10).map((row, index) => (
                      <CTableRow key={index}>
                        <CTableDataCell>{row.firstname} {row.lastname}</CTableDataCell>
                        <CTableDataCell>{row.email}</CTableDataCell>
                        <CTableDataCell>{row.department}</CTableDataCell>
                        <CTableDataCell>{row.job_title}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
                {bulkData.length > 10 && (
                  <div className="text-center text-muted mt-2">
                    ... and {bulkData.length - 10} more employees
                  </div>
                )}
              </div>
            </>
          )}

          {bulkLoading && (
            <div className="text-center">
              <div className="mb-3">
                <CSpinner className="me-2" />
                Processing employees... ({bulkProgress.current} of {bulkProgress.total})
                <br />
                <small className="text-muted">Sending to Employee Server and logging to Admin Server</small>
              </div>
              <CProgress 
                value={(bulkProgress.current / bulkProgress.total) * 100} 
                className="mb-3"
              />
            </div>
          )}

          {!bulkLoading && (bulkResults.success > 0 || bulkResults.failed > 0) && (
            <div>
              <div className="mb-3">
                <CBadge color="success" className="me-2">
                  <CIcon icon={cilCheckCircle} className="me-1" />
                  {bulkResults.success} Successful
                </CBadge>
                <CBadge color="danger">
                  <CIcon icon={cilXCircle} className="me-1" />
                  {bulkResults.failed} Failed
                </CBadge>
              </div>

              {bulkResults.errors.length > 0 && (
                <div>
                  <strong>Errors:</strong>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="mt-2">
                    {bulkResults.errors.map((error, index) => (
                      <div key={index} className="alert alert-danger py-2 mb-2">
                        <small>
                          <strong>Row {error.row}:</strong> {error.error}
                          <br />
                          <span className="text-muted">
                            {error.data.firstname} {error.data.lastname} ({error.data.email})
                          </span>
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          {!bulkLoading && bulkResults.success === 0 && bulkResults.failed === 0 && (
            <>
              <CButton color="secondary" onClick={closeBulkModal}>
                Cancel
              </CButton>
              <CButton color="primary" onClick={handleBulkUpload}>
                <CIcon icon={cilCloudUpload} className="me-2" />
                Upload {bulkData.length} Employees
              </CButton>
            </>
          )}
          
          {(bulkResults.success > 0 || bulkResults.failed > 0) && !bulkLoading && (
            <CButton color="primary" onClick={closeBulkModal}>
              Close
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Create;