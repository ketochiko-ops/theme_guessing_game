import React, { useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';

function Observer() {
  const { gameState, role } = useContext(SocketContext);
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
        <div className="alert alert-info mb-4">
          <h5>現在のお題: <strong>{room.theme}</strong></h5>
          <p className="mb-0">現在のターン: {room.current_turn === 'p1' ? 'プレイヤー1' : 'プレイヤー2'}</p>
        </div>
      )}

      <div className="row mb-4 text-center">
        <div className="col-6">
          <div className="card bg-light">
            <div className="card-body">
              <h5 className="card-title text-danger">P1 ライフ</h5>
              <h3 className="mb-0">{room.p1_lives !== undefined ? room.p1_lives : '-'}</h3>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="card bg-light">
            <div className="card-body">
              <h5 className="card-title text-success">P2 ライフ</h5>
              <h3 className="mb-0">{room.p2_lives !== undefined ? room.p2_lives : '-'}</h3>
            </div>
          </div>
        </div>
      </div>

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

      <div className="text-center text-muted mt-2">
        <small>※あなたは観戦者です。チャットを送信することはできません。</small>
      </div>
    </div>
  );
}

export default Observer;
