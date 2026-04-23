import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Client from 'socket.io-client';

process.env.NODE_ENV = 'test';
import { server, io, db } from '../server.js';

describe('Backend Socket & DB Integration', () => {
  let clientGM;
  let clientP1;
  const port = 8081;

  beforeAll(async () => {
    await new Promise((resolve) => server.listen(port, resolve));
    clientGM = new Client(`http://localhost:${port}`);
    clientP1 = new Client(`http://localhost:${port}`);

    await new Promise((resolve) => {
      let connected = 0;
      const checkDone = () => {
        connected++;
        if (connected === 2) resolve();
      };
      clientGM.on('connect', checkDone);
      clientP1.on('connect', checkDone);
    });
  });

  afterAll(async () => {
    clientGM.close();
    clientP1.close();
    await new Promise((resolve) => {
      db.run("DELETE FROM rooms WHERE room_id = 'test-room'", () => {
        io.close();
        server.close(() => resolve());
      });
    });
  });

  it('新規のルームに参加できること', () => {
    return new Promise((resolve) => {
      clientGM.emit('join_room', { roomId: 'test-room', role: 'gm' });

      clientGM.on('game_state_update', (data) => {
        if (data.room && data.room.room_id === 'test-room' && data.room.state === 'waiting') {
          clientGM.off('game_state_update');
          expect(data.room.p1_lives).toBe(5);
          resolve();
        }
      });
    });
  });

  it('GMがお題を設定し、状態が ready に変わること', () => {
    return new Promise((resolve) => {
      clientGM.emit('set_theme', { theme: 'りんご' });

      clientGM.on('game_state_update', (data) => {
        if (data.room && data.room.state === 'ready') {
          clientGM.off('game_state_update');
          expect(data.room.theme).toBe('りんご');
          resolve();
        }
      });
    });
  });

  it('GMがゲームを開始し、状態が playing に変わること', () => {
    return new Promise((resolve) => {
      clientGM.emit('start_game');

      clientGM.on('game_state_update', (data) => {
        if (data.room && data.room.state === 'playing') {
          clientGM.off('game_state_update');
          expect(data.room.current_turn).toBe('p1');
          resolve();
        }
      });
    });
  });

  it('プレイヤーが質問を送信できること', () => {
    return new Promise((resolve) => {
      clientP1.emit('join_room', { roomId: 'test-room', role: 'p1' });
      
      setTimeout(() => {
        clientP1.emit('send_question', { text: '赤いですか？' });
      }, 100);

      clientGM.on('game_state_update', (data) => {
        const lastLog = data.logs[data.logs.length - 1];
        if (lastLog && lastLog.message_type === 'question' && lastLog.message === '赤いですか？') {
          clientGM.off('game_state_update');
          expect(data.room.p1_questions).toBe(1);
          resolve();
        }
      });
    });
  });

  it('GMが質問に回答できること', () => {
    return new Promise((resolve) => {
      clientGM.emit('send_answer', { text: 'はい', targetRole: 'p1' });

      clientGM.on('game_state_update', (data) => {
        const lastLog = data.logs[data.logs.length - 1];
        if (lastLog && lastLog.message_type === 'answer' && lastLog.message.includes('はい')) {
          clientGM.off('game_state_update');
          resolve();
        }
      });
    });
  });

  it('チャットの有効・無効を切り替えられること', () => {
    return new Promise((resolve) => {
      clientGM.emit('toggle_chat', { enabled: false });

      clientGM.on('game_state_update', (data) => {
        if (data.room && data.room.chat_enabled === 0) {
          clientGM.off('game_state_update');
          resolve();
        }
      });
    });
  });

  it('正解を出すとゲームが終了すること', () => {
    return new Promise((resolve) => {
      clientP1.emit('guess_or_pass', { action: 'guess', guess: 'りんご' });

      clientGM.on('game_state_update', (data) => {
        if (data.room && data.room.state === 'finished') {
          clientGM.off('game_state_update');
          expect(data.room.winner).toBe('p1');
          resolve();
        }
      });
    });
  });
});
