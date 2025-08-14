import { legacy_createStore as createStore } from 'redux'

const initialState = {
  sidebarShow: true,
  sidebarUnfoldable: false,
  theme: 'light',
  authenticated: false,
  admin: null
}

const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    case 'logout':
      return { 
        ...initialState,
        sidebarShow: state.sidebarShow,
        theme: state.theme
      }
    default:
      return state
  }
}

const store = createStore(changeState)
export default store