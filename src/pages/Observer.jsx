import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import GameStatus from '../components/GameStatus';

function Observer() {
  const { socket, gameState, role } = useContext(SocketContext);
  const [chatInput, setChatInput] = useState('');
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!role || role !== 'obs') {
      navigate('/');
    }
  }, [role, navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs]);

  if (!gameState.room) return <div className="text-center mt-5">ロード中...</div>;

  const room = gameState.room;
  const isPlaying = room.state === 'playing';

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>観戦者 画面</h2>
        <span className="badge bg-secondary">Room: {room.room_id}</span>
      </div>

      {!isPlaying ? (
        <div className="alert alert-secondary text-center mb-4">
          ゲーム開始をお待ちください...
        </div>
      ) : (
        <GameStatus room={room} role={role} />
      )}

      <div className="chat-area border rounded p-3 mb-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#fff' }}>
        {gameState.logs.map((log) => {
          let badgeColor = 'bg-dark';
          if (log.sender_role === 'p1') badgeColor = 'bg-danger';
          if (log.sender_role === 'p2') badgeColor = 'bg-success';
          
          return (
            <div key={log.id} className="mb-2">
              <span className={`badge me-2 ${badgeColor}`}>{log.sender_role.toUpperCase()}</span>
              <span>{log.message}</span>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {room.chat_enabled === 1 ? (
        <div className="mb-2">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (chatInput) {
              socket.emit('send_chat', { text: chatInput });
              setChatInput('');
            }
          }}>
            <div className="input-group">
              <input 
                type="text" 
                className="form-control" 
                placeholder="全体チャットにメッセージを送信..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="btn btn-secondary" type="submit" disabled={!chatInput}>
                送信
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="text-center text-muted mt-2">
          <small>※現在、全体チャットは無効にされています。</small>
        </div>
      )}
    </div>
  );
}

export default Observer;
