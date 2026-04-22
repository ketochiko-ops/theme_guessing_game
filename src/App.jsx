import React, { createContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Top from './pages/Top';
import GameMaster from './pages/GameMaster';
import Player from './pages/Player';
import Result from './pages/Result';

export const SocketContext = createContext();

const SOCKET_SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080' : '/';
const socket = io(SOCKET_SERVER_URL);

// Context Provider
function App() {
  const [gameState, setGameState] = useState({ room: null, logs: [] });
  const [role, setRole] = useState(null); // 'gm', 'p1', 'p2'

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('game_state_update', (data) => {
      setGameState({ room: data.room, logs: data.logs || gameState.logs });
    });

    return () => {
      socket.off('connect');
      socket.off('game_state_update');
    };
  }, [gameState.logs]);

  return (
    <SocketContext.Provider value={{ socket, gameState, role, setRole }}>
      <Router>
        <div className="game-container">
          <Routes>
            <Route path="/" element={<Top />} />
            <Route path="/gm" element={<GameMaster />} />
            <Route path="/player" element={<Player />} />
            <Route path="/result" element={<Result />} />
          </Routes>
        </div>
      </Router>
    </SocketContext.Provider>
  );
}

export default App;
