import './App.css';
import { DocumentManager } from './document/DocumentManager';
import { createContext } from 'react';
import { observer } from 'mobx-react';
import {ThemeProvider, createTheme} from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Body from './Body'
function App() {
  const DocumentManagerContext = createContext(null)
  const documentManager = new DocumentManager();
  
  const buttonOverrides = {
    // Name of the slot
    root: ({ownerState, theme}) => ({
      

      // Some CSS
      fontSize: '1rem',

      color:'white',
      borderRadius: '10px',
      marginInline: '0.3rem',
      boxSizing:'border-box',
      backgroundColor: 
      (ownerState.color === 'primary' && theme.palette.primary.main),

        '&:hover': {
          backgroundColor: (ownerState.color === 'primary' && theme.palette.secondary.main)
        },
      }),

    }
  const checkboxOverrides = {
    root: {
      // Some CSS
      color:'white',
      width: 24,
      height:24
    },
  }
  // theming for mui components
  const themeOptions = {
    palette: {
      mode: 'dark',
      
        primary: {main:'rgb(125, 115, 231)'},
        secondary:{main: 'rgb(95, 85, 205)'}
    },
    components: {
      // Name of the component
      MuiButton: {styleOverrides: buttonOverrides},
      MuiIconButton: {styleOverrides : buttonOverrides},
      MuiCheckbox: {styleOverrides: checkboxOverrides}
    }
  };
  return (
    <CssBaseline>
    <ThemeProvider theme={createTheme(themeOptions)}>
    <DocumentManagerContext.Provider value={documentManager}>
    <Body></Body>
    
    </DocumentManagerContext.Provider>
    </ThemeProvider>
    </CssBaseline>
  );
}

export default observer(App);