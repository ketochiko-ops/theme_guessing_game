import React, { useState, useEffect } from 'react';

function GameStatus({ room, role }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (room.state === 'playing') {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [room.state]);

  if (!room) return null;

  const p1Time = room.p1_time_used ? Math.floor(room.p1_time_used / 1000) : 0;
  const p2Time = room.p2_time_used ? Math.floor(room.p2_time_used / 1000) : 0;

  const currentP1Time = p1Time + (room.state === 'playing' && room.current_turn === 'p1' && room.timer_start_time ? Math.floor(Math.max(0, now - room.timer_start_time) / 1000) : 0);
  const currentP2Time = p2Time + (room.state === 'playing' && room.current_turn === 'p2' && room.timer_start_time ? Math.floor(Math.max(0, now - room.timer_start_time) / 1000) : 0);

  const canSeeTheme = role === 'gm' || role === 'obs';

  return (
    <>
      {(room.state === 'playing' || room.state === 'paused') && (
        <div className={`alert ${room.state === 'paused' ? 'alert-warning' : 'alert-info'} mb-4`}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>{canSeeTheme && <h5 className="mb-0">現在のお題: <strong>{room.theme}</strong></h5>}</div>
            {room.state === 'paused' && <span className="badge bg-danger fs-6">一時停止中</span>}
          </div>
          <p className="mb-0">
          現在のターン: {room.current_turn === 'p1' ? 'プレイヤー1' : 'プレイヤー2'} 
          <span className="ms-2 badge bg-primary">第 {room.turn_count || 1} ターン</span>
        </p>
        </div>
      )}

      <div className="row mb-4 text-center">
        <div className="col-6">
          <div className="card bg-light">
            <div className="card-body py-3">
              <h5 className="card-title text-danger">P1 ライフ</h5>
              <h3 className="mb-1">{room.p1_lives !== undefined ? room.p1_lives : '-'}</h3>
              <div className="text-muted small">使用時間: {currentP1Time}秒</div>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="card bg-light">
            <div className="card-body py-3">
              <h5 className="card-title text-success">P2 ライフ</h5>
              <h3 className="mb-1">{room.p2_lives !== undefined ? room.p2_lives : '-'}</h3>
              <div className="text-muted small">使用時間: {currentP2Time}秒</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default GameStatus;
