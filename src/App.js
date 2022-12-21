import Navbar from './components/navbar/Navbar'
import Sidebar from './components/sidebar/Sidebar'
import Body from './components/body/Body'
import './App.css';
import documentManager from './document/DocumentManager';

function App() {
  console.log(documentManager.model.pathlist);
  return (
    <div className="App">
      <Navbar></Navbar>
      
      
      <div className="Page">
      <Sidebar></Sidebar>
        <Body></Body>
      </div>
    </div>
  );
}

export default App;