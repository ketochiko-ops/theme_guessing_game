import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import GameStatus from '../components/GameStatus';

function GameMaster() {
  const { socket, gameState, role } = useContext(SocketContext);
  const [theme, setTheme] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [generalChatInput, setGeneralChatInput] = useState('');
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

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handlePause = () => {
    socket.emit('pause_game');
  };

  const handleResume = () => {
    socket.emit('resume_game');
  };

  const handleAnswer = (e, targetRole) => {
    e.preventDefault();
    if (answerInput) {
      socket.emit('send_answer', { text: answerInput, targetRole });
      setAnswerInput('');
    }
  };

  const handleSendGeneralChat = (e) => {
    e.preventDefault();
    if (generalChatInput) {
      socket.emit('send_chat', { text: generalChatInput });
      setGeneralChatInput('');
    }
  };

  const room = gameState.room;
  const isWaiting = room.state === 'waiting';
  const isReady = room.state === 'ready';
  const isPlaying = room.state === 'playing';
  const isPaused = room.state === 'paused';

  const lastLog = gameState.logs.length > 0 ? gameState.logs[gameState.logs.length - 1] : null;
  const pendingQuestionRole = (lastLog && lastLog.message_type === 'question') ? lastLog.sender_role : null;

  const handleReset = () => {
    if (window.confirm('ゲームをリセットして最初からやり直しますか？')) {
      socket.emit('reset_game');
    }
  };

  const handleQuickAnswer = (e, text) => {
    e.preventDefault();
    if (text && pendingQuestionRole) {
      socket.emit('send_answer', { text, targetRole: pendingQuestionRole });
    }
  };

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>GM 画面</h2>
        <div>
          {isPlaying && (
            <button className="btn btn-warning btn-sm me-2" onClick={handlePause}>一時停止</button>
          )}
          {isPaused && (
            <button className="btn btn-success btn-sm me-2" onClick={handleResume}>再開</button>
          )}
          <button className="btn btn-outline-danger btn-sm me-2" onClick={handleReset}>リセット</button>
          <span className="badge bg-secondary">Room: {room.room_id}</span>
        </div>
      </div>

      {(isWaiting || isReady) ? (
        <div className="mb-4">
          <form onSubmit={handleSetTheme}>
            <div className="input-group mb-2">
              <input 
                type="text" 
                className="form-control" 
                placeholder="お題を入力してください (例: りんご)" 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                disabled={isReady}
                required
              />
              {!isReady ? (
                <button className="btn btn-primary" type="submit">お題を決定する</button>
              ) : (
                <button className="btn btn-secondary" type="button" onClick={() => setTheme('')} disabled>
                  お題決定済み
                </button>
              )}
            </div>
          </form>
          {isReady && (
            <button className="btn btn-success w-100 fw-bold" onClick={handleStartGame}>ゲームを開始する</button>
          )}
        </div>
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

      {!isWaiting && (
        <div className="card bg-light p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">全体チャット</h5>
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="chatToggleSwitch" 
                checked={room.chat_enabled === 1}
                onChange={(e) => socket.emit('toggle_chat', { enabled: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="chatToggleSwitch">
                チャット許可: {room.chat_enabled === 1 ? 'ON' : 'OFF'}
              </label>
            </div>
          </div>
          <form onSubmit={handleSendGeneralChat}>
            <div className="input-group">
              <input 
                type="text" 
                className="form-control" 
                placeholder="全体へのメッセージやヒントを入力..." 
                value={generalChatInput}
                onChange={(e) => setGeneralChatInput(e.target.value)}
              />
              <button 
                className="btn btn-secondary" 
                type="submit"
                disabled={!generalChatInput}
              >
                送信
              </button>
            </div>
          </form>
        </div>
      )}

      {(isPlaying || isPaused) && (
        <div className="card bg-light p-3">
          <h5>プレイヤーへの回答</h5>

          <div className="mb-2 d-flex gap-2">
            <button 
              className="btn btn-primary" 
              onClick={(e) => handleQuickAnswer(e, 'はい')}
              disabled={!pendingQuestionRole || isPaused}
            >
              はい
            </button>
            <button 
              className="btn btn-danger" 
              onClick={(e) => handleQuickAnswer(e, 'いいえ')}
              disabled={!pendingQuestionRole || isPaused}
            >
              いいえ
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={(e) => handleQuickAnswer(e, 'どちらとも言えない')}
              disabled={!pendingQuestionRole || isPaused}
            >
              どちらとも言えない
            </button>
          </div>

          <div className="input-group">
            <input 
              type="text" 
              className="form-control" 
              placeholder="はい / いいえ / わからない 等" 
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              disabled={!pendingQuestionRole || isPaused}
            />
            <button 
              className="btn btn-outline-primary" 
              onClick={(e) => handleAnswer(e, pendingQuestionRole)}
              disabled={!pendingQuestionRole || !answerInput || isPaused}
            >
              回答
            </button>
          </div>
          {!pendingQuestionRole && !isPaused && (
            <small className="text-muted d-block mt-2">
              ※プレイヤーから質問が来るまで回答できません。
            </small>
          )}
          {isPaused && (
            <small className="text-danger d-block mt-2 fw-bold">
              ※一時停止中は回答できません。
            </small>
          )}
        </div>
      )}
    </div>
  );
}

export default GameMaster;
