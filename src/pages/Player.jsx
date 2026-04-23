import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import GameStatus from '../components/GameStatus';

function Player() {
  const { socket, gameState, role } = useContext(SocketContext);
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'game', 'system'
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!role || (role !== 'p1' && role !== 'p2')) {
      navigate('/');
    }
  }, [role, navigate]);

  useEffect(() => {
    if (gameState.room?.state === 'finished') {
      navigate('/result');
    }
  }, [gameState.room?.state, navigate]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.logs, logFilter]);

  if (!gameState.room) return <div className="text-center mt-5">ロード中...</div>;

  const room = gameState.room;
  const isPlaying = room.state === 'playing';
  const isMyTurn = room.current_turn === role;

  // プレイヤーは自分に関するログとGMのアナウンス(system)、全体チャット(chat)のみ表示する
  const visibleLogs = gameState.logs.filter(log => 
    log.sender_role === role || 
    log.message.includes(`[${role}へ]`) || 
    log.message_type === 'system' ||
    log.message_type === 'chat'
  );

  let displayLogs = visibleLogs;
  if (logFilter === 'game') {
    displayLogs = visibleLogs.filter(log => ['question', 'answer', 'guess'].includes(log.message_type));
  } else if (logFilter === 'system') {
    displayLogs = visibleLogs.filter(log => ['system', 'chat'].includes(log.message_type));
  }

  const handleSendQuestion = (e) => {
    e.preventDefault();
    if (questionInput && isMyTurn) {
      socket.emit('send_question', { text: questionInput });
      setQuestionInput('');
    }
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (guessInput && isMyTurn) {
      socket.emit('guess_or_pass', { action: 'guess', guess: guessInput });
      setGuessInput('');
    }
  };

  const handlePass = () => {
    if (isMyTurn) {
      socket.emit('guess_or_pass', { action: 'pass' });
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput) {
      socket.emit('send_chat', { text: chatInput });
      setChatInput('');
    }
  };

  return (
    <div className={`card p-4 transition-all ${isMyTurn ? 'bg-warning bg-opacity-25 border-warning border-3 shadow' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{role === 'p1' ? 'プレイヤー1' : 'プレイヤー2'} 画面</h2>
        <span className={`badge ${isMyTurn ? 'bg-warning text-dark fs-6' : 'bg-secondary'}`}>
          {isMyTurn ? '🔔 あなたのターンです！' : '相手のターンを待っています'}
        </span>
      </div>

      <GameStatus room={room} role={role} />

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">チャットログ</h5>
          <div className="btn-group btn-group-sm">
            <button className={`btn ${logFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setLogFilter('all')}>すべて</button>
            <button className={`btn ${logFilter === 'game' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setLogFilter('game')}>質問・回答のみ</button>
            <button className={`btn ${logFilter === 'system' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setLogFilter('system')}>システムのみ</button>
          </div>
        </div>
        <div className="chat-area border rounded p-3" style={{ height: '300px', overflowY: 'auto', backgroundColor: '#fff' }}>
          {!isPlaying && <div className="text-center text-muted mt-5">GMがお題を設定するのをお待ちください...</div>}
          {displayLogs.map((log) => {
            let badgeColor = 'bg-primary';
            if (log.sender_role === 'gm') badgeColor = 'bg-dark';
            if (log.sender_role === 'obs') badgeColor = 'bg-info';

            return (
              <div key={log.id} className={`mb-1 ${log.sender_role === role ? 'text-end' : ''}`}>
                <span className={`badge me-2 ${badgeColor}`}>
                  {log.sender_role.toUpperCase()}
                </span>
                <span>{log.message}</span>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {room.chat_enabled === 1 && (
        <div className="mb-4">
          <form onSubmit={handleSendChat}>
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
      )}

      {(isPlaying || room.state === 'paused') && (
        <div>
          {/* アクション: 質問 */}
          <form onSubmit={handleSendQuestion} className="mb-3">
            <div className="input-group">
              <input 
                type="text" 
                className="form-control" 
                placeholder="GMに質問する (例: 食べ物ですか？)" 
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                disabled={!isMyTurn || room.state === 'paused'}
              />
              <button className="btn btn-primary" type="submit" disabled={!isMyTurn || !questionInput || room.state === 'paused'}>質問送信</button>
            </div>
          </form>

          {/* アクション: お題回答・パス */}
          <div className="row g-2">
            <div className="col-sm-8">
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control border-success" 
                  placeholder="お題をズバリ当てる！" 
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  disabled={!isMyTurn || room.state === 'paused'}
                />
                <button className="btn btn-success" onClick={handleGuess} disabled={!isMyTurn || !guessInput || room.state === 'paused'}>
                  回答する！
                </button>
              </div>
            </div>
            <div className="col-sm-4 text-end">
              <button className="btn btn-secondary w-100" onClick={handlePass} disabled={!isMyTurn || room.state === 'paused'}>
                パス (ターン終了)
              </button>
            </div>
          </div>
          <small className="text-muted d-block mt-2">
            ※質問への回答をもらった後、「お題を回答」するか「パス」して相手にターンを渡してください。
          </small>
          {room.state === 'paused' && (
            <small className="text-danger d-block mt-1 fw-bold">
              ※一時停止中のため操作できません。
            </small>
          )}
        </div>
      )}
    </div>
  );
}

export default Player;
