import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import GameStatus from '../components/GameStatus';

function Observer() {
  const { socket, gameState, role } = useContext(SocketContext);
  const [chatInput, setChatInput] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'p1', 'p2', 'system'
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!role || role !== 'obs') {
      navigate('/');
    }
  }, [role, navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs, logFilter]);

  if (!gameState.room) return <div className="text-center mt-5">ロード中...</div>;

  const room = gameState.room;
  const isPlaying = room.state === 'playing';

  let displayLogs = gameState.logs;
  if (logFilter === 'p1') {
    displayLogs = gameState.logs.filter(log => 
      ['question', 'answer', 'guess'].includes(log.message_type) &&
      (log.sender_role === 'p1' || log.message.includes('[p1へ]'))
    );
  } else if (logFilter === 'p2') {
    displayLogs = gameState.logs.filter(log => 
      ['question', 'answer', 'guess'].includes(log.message_type) &&
      (log.sender_role === 'p2' || log.message.includes('[p2へ]'))
    );
  } else if (logFilter === 'system') {
    displayLogs = gameState.logs.filter(log => ['system', 'chat'].includes(log.message_type));
  }

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

      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">チャットログ</h5>
          <div className="btn-group btn-group-sm">
            <button className={`btn ${logFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setLogFilter('all')}>すべて</button>
            <button className={`btn ${logFilter === 'p1' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setLogFilter('p1')}>P1関連</button>
            <button className={`btn ${logFilter === 'p2' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setLogFilter('p2')}>P2関連</button>
            <button className={`btn ${logFilter === 'system' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setLogFilter('system')}>システム</button>
          </div>
        </div>
        <div className="chat-area border rounded p-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#fff' }}>
          {displayLogs.map((log) => {
            let badgeColor = 'bg-dark';
            if (log.sender_role === 'p1') badgeColor = 'bg-danger';
            if (log.sender_role === 'p2') badgeColor = 'bg-success';
            if (log.sender_role === 'obs') badgeColor = 'bg-info';
            
            return (
              <div key={log.id} className="mb-1">
                <span className={`badge me-2 ${badgeColor}`}>{log.sender_role.toUpperCase()}</span>
                <span>{log.message}</span>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>
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
