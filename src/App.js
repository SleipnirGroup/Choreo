import Navbar from './components/navbar/Navbar'
import Sidebar from './components/sidebar/Sidebar'
import './App.css';
import { DocumentManager } from './document/DocumentManager';
import { createContext } from 'react';
import Field from './components/field/Field';
import { observer } from 'mobx-react';
import RobotConfigPanel from './components/config/RobotConfigPanel'
function App() {
  const DocumentManagerContext = createContext(null)
  const documentManager = new DocumentManager();
  return (
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
  );
}

export default observer(App);