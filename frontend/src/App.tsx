import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HostGame from './pages/HostGame';
import PlayerGame from './pages/PlayerGame';
import JoinGame from './pages/JoinGame';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-nye-gradient text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host/:roomId" element={<HostGame />} />
          <Route path="/join/:roomId" element={<JoinGame />} />
          <Route path="/play/:roomId" element={<PlayerGame />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
