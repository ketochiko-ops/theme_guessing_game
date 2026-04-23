import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GAME_CONFIG: ゲームの定数設定
const GAME_CONFIG = {
  INITIAL_LIVES: 5,
  SCORE_MULTIPLIER: 1000,
  TIME_PENALTY: 1,      // 1秒につき1ポイント減少
  QUESTION_PENALTY: 10,  // 質問1回につき10ポイント減少
  CLEANUP_INTERVAL_MS: 1000 * 60 * 10, // 10分ごとにクリーンアップ処理を実行
  CLEANUP_THRESHOLD_MS: 1000 * 60 * 60, // 1時間更新がないルームを削除
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 8080;

// SQLite3 DB 初期化
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) console.error('DB接続エラー:', err);
  else console.log('SQLite DBに接続しました。');
});

// テーブル初期化
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id TEXT PRIMARY KEY,
      theme TEXT,
      state TEXT, -- 'waiting', 'playing', 'finished'
      current_turn TEXT, -- 'p1', 'p2'
      turn_count INTEGER DEFAULT 1,
      p1_lives INTEGER,
      p2_lives INTEGER,
      p1_questions INTEGER DEFAULT 0,
      p2_questions INTEGER DEFAULT 0,
      p1_time_used INTEGER DEFAULT 0,
      p2_time_used INTEGER DEFAULT 0,
      timer_start_time INTEGER,
      start_time INTEGER,
      last_update INTEGER,
      winner TEXT,
      chat_enabled INTEGER DEFAULT 1
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      sender_role TEXT,
      message_type TEXT,
      message TEXT,
      timestamp INTEGER
    )
  `);
});

// 静的ファイルの配信 (Viteビルド後)
app.use(express.static(path.join(__dirname, 'dist')));

// DBヘルパー関数
const getRoom = (roomId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM rooms WHERE room_id = ?', [roomId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getLogs = (roomId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM logs WHERE room_id = ? ORDER BY timestamp ASC', [roomId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const updateRoom = (roomId, updates) => {
  return new Promise((resolve, reject) => {
    updates.last_update = Date.now();
    const keys = Object.keys(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    db.run(`UPDATE rooms SET ${setClause} WHERE room_id = ?`, [...values, roomId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};

// クリーンアップ処理
setInterval(() => {
  const threshold = Date.now() - GAME_CONFIG.CLEANUP_THRESHOLD_MS;
  db.serialize(() => {
    db.all('SELECT room_id FROM rooms WHERE last_update < ?', [threshold], (err, rows) => {
      if (err || !rows) return;
      rows.forEach(row => {
        db.run('DELETE FROM rooms WHERE room_id = ?', [row.room_id]);
        db.run('DELETE FROM logs WHERE room_id = ?', [row.room_id]);
        console.log(`Cleaned up old room: ${row.room_id}`);
      });
    });
  });
}, GAME_CONFIG.CLEANUP_INTERVAL_MS);

// Socket.IO 処理
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // ルーム参加
  socket.on('join_room', async ({ roomId, role }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role;

    let room = await getRoom(roomId);
    if (!room) {
      // ルーム新規作成
      const now = Date.now();
      db.run(
        `INSERT INTO rooms (room_id, state, p1_lives, p2_lives, start_time, last_update, chat_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [roomId, 'waiting', GAME_CONFIG.INITIAL_LIVES, GAME_CONFIG.INITIAL_LIVES, now, now, 1]
      );
      room = await getRoom(roomId);
    }
    
    const logs = await getLogs(roomId);
    io.to(roomId).emit('game_state_update', { room, logs });
  });

  // ゲームリセット (GM)
  socket.on('reset_game', async () => {
    if (!socket.roomId) return;
    await updateRoom(socket.roomId, {
      theme: null,
      state: 'waiting',
      current_turn: null,
      turn_count: 1,
      p1_lives: GAME_CONFIG.INITIAL_LIVES,
      p2_lives: GAME_CONFIG.INITIAL_LIVES,
      p1_questions: 0,
      p2_questions: 0,
      p1_time_used: 0,
      p2_time_used: 0,
      timer_start_time: null,
      start_time: Date.now(),
      winner: null,
      chat_enabled: 1
    });
    
    // ログを削除
    await new Promise((resolve) => {
      db.run('DELETE FROM logs WHERE room_id = ?', [socket.roomId], () => resolve());
    });

    const room = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room, logs: [] });
  });

  // お題設定 (GM)
  socket.on('set_theme', async ({ theme }) => {
    if (!socket.roomId) return;
    await updateRoom(socket.roomId, {
      theme,
      state: 'ready',
    });
    const room = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room });
  });

  // ゲーム開始 (GM)
  socket.on('start_game', async () => {
    if (!socket.roomId) return;
    const room = await getRoom(socket.roomId);
    if (room.state !== 'ready' && room.state !== 'waiting') return;
    
    await updateRoom(socket.roomId, {
      state: 'playing',
      current_turn: 'p1', // P1からスタート
      turn_count: 1,
      p1_time_used: 0,
      p2_time_used: 0,
      timer_start_time: Date.now(),
      start_time: Date.now() // 開始時間をリセット
    });
    const updatedRoom = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room: updatedRoom });
    await addLog(socket.roomId, 'gm', 'system', `ゲーム開始です！`);
  });

  // 一時停止 (GM)
  socket.on('pause_game', async () => {
    if (!socket.roomId) return;
    const room = await getRoom(socket.roomId);
    if (room.state !== 'playing') return;

    const updates = { state: 'paused', timer_start_time: null };
    if (room.timer_start_time) {
      const timeSpent = Date.now() - room.timer_start_time;
      if (room.current_turn === 'p1') updates.p1_time_used = room.p1_time_used + timeSpent;
      if (room.current_turn === 'p2') updates.p2_time_used = room.p2_time_used + timeSpent;
    }
    await updateRoom(socket.roomId, updates);
    const updatedRoom = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room: updatedRoom });
    await addLog(socket.roomId, 'gm', 'system', `ゲームが一時停止されました。`);
  });

  // 再開 (GM)
  socket.on('resume_game', async () => {
    if (!socket.roomId) return;
    const room = await getRoom(socket.roomId);
    if (room.state !== 'paused') return;

    const updates = { state: 'playing' };
    const logs = await getLogs(socket.roomId);
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
    const isWaitingForAnswer = lastLog && lastLog.message_type === 'question';
    
    // 質問への回答待ちでなければタイマー再開
    if (!isWaitingForAnswer) {
      updates.timer_start_time = Date.now();
    }
    
    await updateRoom(socket.roomId, updates);
    const updatedRoom = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room: updatedRoom });
    await addLog(socket.roomId, 'gm', 'system', `ゲームが再開されました。`);
  });

  // 質問送信 (プレイヤーからGM)
  socket.on('send_question', async ({ text }) => {
    if (!socket.roomId || !socket.role) return;
    const room = await getRoom(socket.roomId);
    if (room.state !== 'playing' || room.current_turn !== socket.role) return;

    // 質問回数をインクリメントし、タイマーを一時停止する
    const updates = {};
    if (socket.role === 'p1') {
      updates.p1_questions = room.p1_questions + 1;
      if (room.timer_start_time) {
        updates.p1_time_used = room.p1_time_used + (Date.now() - room.timer_start_time);
      }
    }
    if (socket.role === 'p2') {
      updates.p2_questions = room.p2_questions + 1;
      if (room.timer_start_time) {
        updates.p2_time_used = room.p2_time_used + (Date.now() - room.timer_start_time);
      }
    }
    updates.timer_start_time = null;
    await updateRoom(socket.roomId, updates);

    await addLog(socket.roomId, socket.role, 'question', text);
    // 質問送信時はターンはそのまま（GMの回答待ち）
  });

  // 回答送信 (GMからプレイヤー)
  socket.on('send_answer', async ({ text, targetRole }) => {
    if (!socket.roomId) return;
    await addLog(socket.roomId, 'gm', 'answer', `[${targetRole}へ] ${text}`);
    
    // 質問が回答されたのでプレイヤーのタイマーを再開する
    const room = await getRoom(socket.roomId);
    if (room && room.state === 'playing' && !room.timer_start_time) {
      await updateRoom(socket.roomId, { timer_start_time: Date.now() });
      
      // クライアントへ同期
      const updatedRoom = await getRoom(socket.roomId);
      const logs = await getLogs(socket.roomId);
      io.to(socket.roomId).emit('game_state_update', { room: updatedRoom, logs });
    }
  });

  // 全体チャット送信
  socket.on('send_chat', async ({ text }) => {
    if (!socket.roomId || !socket.role) return;
    
    // GM以外はchat_enabledが1の時のみ送信可能
    if (socket.role !== 'gm') {
      const room = await getRoom(socket.roomId);
      if (!room || room.chat_enabled === 0) return;
    }
    
    await addLog(socket.roomId, socket.role, 'chat', text);
  });

  // 全体チャットのON/OFF切り替え (GM)
  socket.on('toggle_chat', async ({ enabled }) => {
    if (!socket.roomId || socket.role !== 'gm') return;
    await updateRoom(socket.roomId, { chat_enabled: enabled ? 1 : 0 });
    const room = await getRoom(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room });
    await addLog(socket.roomId, 'gm', 'system', `全体チャットが${enabled ? 'ON' : 'OFF'}になりました。`);
  });

  // お題予想 / パス
  socket.on('guess_or_pass', async ({ action, guess }) => {
    if (!socket.roomId || !socket.role) return;
    let room = await getRoom(socket.roomId);
    if (room.state !== 'playing' || room.current_turn !== socket.role) return;

    if (action === 'pass') {
      await addLog(socket.roomId, socket.role, 'system', `パスしました。`);
    } else if (action === 'guess') {
      await addLog(socket.roomId, socket.role, 'guess', `お題は「${guess}」ですか？`);
      
      if (guess === room.theme) {
        // 正解
        await addLog(socket.roomId, 'gm', 'system', `${socket.role}が正解しました！`);
        await updateRoom(socket.roomId, { state: 'finished', winner: socket.role });
      } else {
        // 不正解
        await addLog(socket.roomId, 'gm', 'system', `不正解です。ライフが1減ります。`);
        let newLives = socket.role === 'p1' ? room.p1_lives - 1 : room.p2_lives - 1;
        const updates = {};
        if (socket.role === 'p1') updates.p1_lives = newLives;
        if (socket.role === 'p2') updates.p2_lives = newLives;
        
        if (newLives <= 0) {
          // 敗北
          const winner = socket.role === 'p1' ? 'p2' : 'p1';
          updates.state = 'finished';
          updates.winner = winner;
          await addLog(socket.roomId, 'gm', 'system', `${socket.role}のライフが0になりました。${winner}の勝利です！`);
        }
        await updateRoom(socket.roomId, updates);
      }
    }

    room = await getRoom(socket.roomId);

    // ターン終了時に時間を確定
    const updates = {};
    let timeSpent = 0;
    if (room.timer_start_time) {
      timeSpent = Date.now() - room.timer_start_time;
    }
    if (socket.role === 'p1') updates.p1_time_used = room.p1_time_used + timeSpent;
    if (socket.role === 'p2') updates.p2_time_used = room.p2_time_used + timeSpent;

    // ターン交代 (ゲームが終了していない場合のみ)
    if (room.state === 'playing') {
      const nextTurn = room.current_turn === 'p1' ? 'p2' : 'p1';
      updates.current_turn = nextTurn;
      if (nextTurn === 'p1') {
        updates.turn_count = room.turn_count + 1;
      }
      updates.timer_start_time = Date.now();
    } else {
      updates.timer_start_time = null;
    }
    await updateRoom(socket.roomId, updates);
    
    // 状態同期
    room = await getRoom(socket.roomId);
    const logs = await getLogs(socket.roomId);
    io.to(socket.roomId).emit('game_state_update', { room, logs });
  });

  const addLog = async (roomId, sender, type, message) => {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      db.run(
        `INSERT INTO logs (room_id, sender_role, message_type, message, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [roomId, sender, type, message, now],
        async function (err) {
          if (err) reject(err);
          // 最新ログを送信
          const room = await getRoom(roomId);
          const logs = await getLogs(roomId);
          io.to(roomId).emit('game_state_update', { room, logs });
          resolve();
        }
      );
    });
  };

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// React Router のフォールバックロジック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export { server, io, db, getRoom, getLogs, updateRoom };
