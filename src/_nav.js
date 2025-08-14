
import CIcon from '@coreui/icons-react'
import {
  cilDialpad,
  cilGroup,
  cilSpeedometer,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },
  {
    component: CNavTitle,
    name: 'Components',
  },
  {
    component: CNavGroup,
    name: 'Employees',
    to: '/employees',
    icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Create',
        to: '/employees/create'
      },
      {
        component: CNavItem,
        name: 'Update',
        to: '/employees/update'
      },
    ]
  },
  {
    component: CNavGroup,
    name: 'Phone numbers',
    to: 'numbers',
    icon: <CIcon icon={cilDialpad} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Numbers',
        to: '/numbers/list'
      },
      {
        component: CNavItem,
        name: 'Create',
        to: '/numbers/create'
      }
    ]
  },
]

export default _nav
