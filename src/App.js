import Navbar from './components/navbar/Navbar'
import Sidebar from './components/sidebar/Sidebar'
import './App.css';
import { DocumentManager } from './document/DocumentManager';
import { createContext } from 'react';
import Field from './components/field/Field';
import { observer } from 'mobx-react';
import RobotConfigPanel from './components/config/RobotConfigPanel'
import {ThemeProvider, createTheme} from '@mui/material/styles'
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
      borderRadius: '10px',
      marginInline: '0.3rem'
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
    <div className="App">
      <Navbar></Navbar>
      
      
      <div className="Page">
      
      <Sidebar></Sidebar>
      <Field containerHeight={300} containerWidth={300}></Field>
      </div>
      
    </div>
    <RobotConfigPanel style={{display: (documentManager.isRobotConfigOpen? "block": "none")}}></RobotConfigPanel>
    </DocumentManagerContext.Provider>
    </ThemeProvider>
  );
}

export default observer(App);