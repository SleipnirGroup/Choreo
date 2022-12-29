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
  documentManager.loadFile("https://gist.githubusercontent.com/shueja-personal/90e7353f852ae2a4e5b390323f9d83db/raw/a7904ae34a2ae2ce38a6dbb0ef35525e06f2c3ee/waymakersave_v0.0.0.json");
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