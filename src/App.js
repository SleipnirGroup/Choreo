import Navbar from './components/navbar/Navbar'
import Sidebar from './components/sidebar/Sidebar'
import Body from './components/body/Body'
import './App.css';

function App() {
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