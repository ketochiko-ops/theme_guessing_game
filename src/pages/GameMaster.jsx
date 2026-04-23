import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import GameStatus from '../components/GameStatus';

function GameMaster() {
  const { socket, gameState, role } = useContext(SocketContext);
  const [theme, setTheme] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!role || role !== 'gm') {
      navigate('/');
    }
  }, [role, navigate]);

  useEffect(() => {
    if (gameState.room?.state === 'finished') {
      navigate('/result');
    }
  }, [gameState.room?.state, navigate]);

  if (!gameState.room) return <div className="text-center mt-5">ロード中...</div>;

  const handleSetTheme = (e) => {
    e.preventDefault();
    if (theme) {
      socket.emit('set_theme', { theme });
    }
  };

  const handleAnswer = (e, targetRole) => {
    e.preventDefault();
    if (answerInput) {
      socket.emit('send_answer', { text: answerInput, targetRole });
      setAnswerInput('');
    }
  };

  const room = gameState.room;
  const isPlaying = room.state === 'playing';

  const lastLog = gameState.logs.length > 0 ? gameState.logs[gameState.logs.length - 1] : null;
  const pendingQuestionRole = (lastLog && lastLog.message_type === 'question') ? lastLog.sender_role : null;

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>GM 画面</h2>
        <span className="badge bg-secondary">Room: {room.room_id}</span>
      </div>

      {!isPlaying ? (
        <form onSubmit={handleSetTheme} className="mb-4">
          <div className="input-group">
            <input 
              type="text" 
              className="form-control" 
              placeholder="お題を入力してください (例: りんご)" 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit">お題を設定して開始</button>
          </div>
        </form>
      ) : (
        <GameStatus room={room} role={role} />
      )}

      <div className="chat-area border rounded p-3 mb-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#fff' }}>
        {gameState.logs.map((log) => (
          <div key={log.id} className={`mb-2 ${log.sender_role === 'gm' ? 'text-end' : ''}`}>
            <span className="badge bg-dark me-2">{log.sender_role.toUpperCase()}</span>
            <span>{log.message}</span>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {isPlaying && (
        <div className="card bg-light p-3">
          <h5>プレイヤーへの回答</h5>
          <div className="input-group">
            <input 
              type="text" 
              className="form-control" 
              placeholder="はい / いいえ / わからない 等" 
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              disabled={!pendingQuestionRole}
            />
            <button 
              className="btn btn-outline-danger" 
              onClick={(e) => handleAnswer(e, 'p1')}
              disabled={pendingQuestionRole !== 'p1'}
            >
              P1へ回答
            </button>
            <button 
              className="btn btn-outline-success" 
              onClick={(e) => handleAnswer(e, 'p2')}
              disabled={pendingQuestionRole !== 'p2'}
            >
              P2へ回答
            </button>
          </div>
          {!pendingQuestionRole && (
            <small className="text-muted d-block mt-2">
              ※プレイヤーから質問が来るまで回答できません。
            </small>
          )}
        </div>
      )}
    </div>
  );
}

export default GameMaster;
