import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';

function Top() {
  const [roomId, setRoomId] = useState(() => Math.floor(10000 + Math.random() * 90000).toString());
  const [selectedRole, setSelectedRole] = useState('gm');
  const { socket, setRole } = useContext(SocketContext);
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (selectedRole === 'gm' && !roomId) {
      setRoomId(Math.floor(10000 + Math.random() * 90000).toString());
    } else if (selectedRole !== 'gm') {
      setRoomId('');
    }
  }, [selectedRole]);

  useEffect(() => {
    // public/info.csv を読み込み
    fetch('/info.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length > 1) {
          // ヘッダーを除外してパース
          const parsedData = lines.slice(1).map(line => {
            // カンマ区切り。簡易パース
            const [flag, date, category, ...contentArr] = line.split(',');
            const content = contentArr.join(','); // 内容にカンマが含まれていた場合の対策
            return { flag, date, category, content };
          });
          // 表示フラグが 1 または true、◯ のものを抽出
          const activeAnnouncements = parsedData.filter(item => 
            item.flag === '1' || item.flag.toLowerCase() === 'true' || item.flag === '○'
          );
          setAnnouncements(activeAnnouncements);
        }
      })
      .catch(err => {
        console.error('お知らせの取得に失敗しました:', err);
      });
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId) return;
    setRole(selectedRole);
    socket.emit('join_room', { roomId, role: selectedRole });
    
    if (selectedRole === 'gm') {
      navigate('/gm');
    } else if (selectedRole === 'obs') {
      navigate('/observer');
    } else {
      navigate('/player');
    }
  };

  return (
    <>
      <div className="card text-center p-4 mb-4 shadow-sm">
        <h1 className="mb-4">お題当てオンライン（仮）</h1>
        <form onSubmit={handleJoin}>
          <div className="mb-3 text-start">
            <label className="form-label fw-bold">部屋番号 {selectedRole === 'gm' && '(GM選択時に自動生成されます)'}</label>
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder={selectedRole === 'gm' ? "自動生成" : "GMから共有された5桁の数字"}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4 text-start">
            <label className="form-label d-block fw-bold">役割を選択</label>
            <div className="btn-group w-100" role="group">
              <input type="radio" className="btn-check" name="role" id="role-gm" autoComplete="off" 
                    checked={selectedRole === 'gm'} onChange={() => setSelectedRole('gm')} />
              <label className="btn btn-outline-primary" htmlFor="role-gm">GM</label>

              <input type="radio" className="btn-check" name="role" id="role-p1" autoComplete="off" 
                    checked={selectedRole === 'p1'} onChange={() => setSelectedRole('p1')} />
              <label className="btn btn-outline-danger" htmlFor="role-p1">P1</label>

              <input type="radio" className="btn-check" name="role" id="role-p2" autoComplete="off" 
                    checked={selectedRole === 'p2'} onChange={() => setSelectedRole('p2')} />
              <label className="btn btn-outline-success" htmlFor="role-p2">P2</label>

              <input type="radio" className="btn-check" name="role" id="role-obs" autoComplete="off" 
                    checked={selectedRole === 'obs'} onChange={() => setSelectedRole('obs')} />
              <label className="btn btn-outline-info" htmlFor="role-obs">観戦者</label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold" disabled={!roomId}>
            ルームに参加 👉
          </button>
        </form>
      </div>

      <div className="card p-4 shadow-sm">
        <h4 className="mb-3 border-bottom pb-2">📢 お知らせ</h4>
        {announcements.length === 0 ? (
          <p className="text-muted text-center my-3">現在、お知らせはありません。</p>
        ) : (
          <div className="list-group">
            {announcements.map((info, idx) => (
              <div key={idx} className="list-group-item text-start border-0 border-bottom">
                <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                  <span className="badge bg-secondary">{info.category}</span>
                  <small className="text-muted">{info.date}</small>
                </div>
                <p className="mb-1 text-dark">{info.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Top;
