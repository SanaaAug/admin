
import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Admin = React.lazy(() => import('./views/admin/list/List'))



const CreateEmployee = React.lazy(() => import('./views/employees/create/Create'))
const UpdateEmployee = React.lazy(() => import('./views/employees/update/Update'))


const Numbers = React.lazy(() => import('./views/numbers/list/List'))
const NumberCreate = React.lazy(() => import('./views/numbers/create/Create'))

const routes = [
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/admin', name: 'Admin', element: Admin},
  
  
  
  { path: '/employees', name: 'Employees', element: UpdateEmployee, exact: true},
  { path: '/employees/create', name: 'Create', element: CreateEmployee},
  { path: '/employees/update', name: 'Update', element: UpdateEmployee},


  { path: '/numbers', name: 'Phone numbers', element: Numbers, exact: true},
  { path: '/numbers/list', name: 'Numbers', element: Numbers},
  { path: '/numbers/create', name: 'Create', element: NumberCreate},
]

export default routes
