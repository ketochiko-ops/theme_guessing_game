import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';

function Result() {
  const { gameState, role } = useContext(SocketContext);
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!gameState.room || gameState.room.state !== 'finished') {
      navigate('/');
    }
  }, [gameState.room, navigate]);

  useEffect(() => {
    if (gameState.room && gameState.room.state === 'finished') {
      const r = gameState.room;
      // 経過時間 (秒) - 勝者の実際の消費時間を使用
      if (r.winner === 'p1' || r.winner === 'p2') {
        const winnerLives = r.winner === 'p1' ? r.p1_lives : r.p2_lives;
        const winnerQs = r.winner === 'p1' ? r.p1_questions : r.p2_questions;
        const winnerTimeUsed = r.winner === 'p1' ? (r.p1_time_used || 0) : (r.p2_time_used || 0);
        
        const seconds = Math.floor(winnerTimeUsed / 1000);
        setElapsedSeconds(seconds);

        // スコア計算: (残りライフ × 1000) - (経過時間(秒) × 1) - (質問数 × 10)
        let calcScore = (winnerLives * 1000) - (seconds * 1) - (winnerQs * 10);
        // スコアがマイナスにならないようにする
        if (calcScore < 0) calcScore = 0;
        setScore(calcScore);
      }
    }
  }, [gameState.room]);

  if (!gameState.room) return null;
  const room = gameState.room;
  const isWinner = room.winner === role;

  return (
    <div className="card p-4 text-center">
      <h1 className="mb-4">ゲーム終了！</h1>
      <div className="alert alert-secondary fs-4">
        正解のお題: <strong>{room.theme}</strong>
      </div>

      <div className="my-5">
        <h2 className="display-4 font-weight-bold" style={{ color: isWinner ? 'green' : (role === 'gm' || role === 'obs' ? 'black' : 'red') }}>
          {room.winner === 'p1' ? 'プレイヤー1' : 'プレイヤー2'} の勝利！
        </h2>
      </div>

      <div className="card bg-light mx-auto mb-4" style={{ maxWidth: '400px' }}>
        <div className="card-header pb-0 border-0 bg-light">
          <h5>勝者のスコア</h5>
        </div>
        <div className="card-body pt-1">
          <h2 className="display-5 text-primary mb-3">{score} pt</h2>
          
          <ul className="list-unstyled text-start mb-0">
            <li>残りライフ: {room.winner === 'p1' ? room.p1_lives : room.p2_lives}</li>
            <li>経過時間: {Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</li>
            <li>質問回数: {room.winner === 'p1' ? room.p1_questions : room.p2_questions}回</li>
          </ul>
        </div>
      </div>

      <div>
        <button className="btn btn-outline-primary" onClick={() => {
          // 強制リロードでトップに戻す（Socketの再接続のため）
          window.location.href = '/';
        }}>
          トップに戻る
        </button>
      </div>
    </div>
  );
}

export default Result;
