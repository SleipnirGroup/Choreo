import logo from './logo.svg';
import FieldBackground from './components/FieldBackground'
import Navbar  from './components/Navbar'
import Sidebar  from './components/Sidebar'
import './App.css';

function App() {
  return (
    <div className="App">
      <Navbar></Navbar>
      <div>
      <Sidebar></Sidebar>
      <FieldBackground></FieldBackground>
      </div>
    </div>
  );
}

export default App;
