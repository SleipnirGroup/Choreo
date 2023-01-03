import './App.css';
import { DocumentManager } from './document/DocumentManager';
import { createContext } from 'react';
import { observer } from 'mobx-react';
import {ThemeProvider, createTheme} from '@mui/material/styles'
import Body from './Body'
function App() {
  const DocumentManagerContext = createContext(null)
  const documentManager = new DocumentManager();
  
  const buttonOverrides = {
    // Name of the slot
    root: {
      // Some CSS
      fontSize: '1rem',
      backgroundColor: 'var(--accent-purple)',
      color:'white',
      borderRadius: '20%',
      marginInline: '0.3rem',
      boxSizing:'border-box'
    },
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
    },
    components: {
      // Name of the component
      MuiButton: {styleOverrides: buttonOverrides},
      MuiIconButton: {styleOverrides : buttonOverrides},
      MuiCheckbox: {styleOverrides: checkboxOverrides}
    },
  };
  return (
    <ThemeProvider theme={createTheme(themeOptions)}>
    <DocumentManagerContext.Provider value={documentManager}>
    <Body></Body>
    
    </DocumentManagerContext.Provider>
    </ThemeProvider>
  );
}

export default observer(App);