import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Result from '../Result';
import { SocketContext } from '../../App';

describe('Result Component', () => {
  const renderWithContext = (gameState, role) => {
    return render(
      <SocketContext.Provider value={{ socket: { emit: vi.fn() }, gameState, role }}>
        <MemoryRouter>
          <Result />
        </MemoryRouter>
      </SocketContext.Provider>
    );
  };

  it('ゲーム終了時、スコアが正しく計算されて表示されること', () => {
    // 経過時間を10秒(10000ms)とする
    const startTime = Date.now() - 10000;
    const lastUpdate = Date.now();
    
    // スコア計算式: (残りライフ × 1000) - (経過時間(秒) × 10) - (質問数 × 50)
    // ライフ: 4 -> 4000
    // 経過: 10秒 -> 100
    // 質問: 2回 -> 100
    // スコア = 4000 - 100 - 100 = 3800
    const mockGameState = {
      room: {
        state: 'finished',
        theme: 'りんご',
        winner: 'p1',
        p1_lives: 4,
        p1_questions: 2,
        start_time: startTime,
        last_update: lastUpdate
      }
    };

    renderWithContext(mockGameState, 'p1');

    // 勝者のテキスト
    expect(screen.getByText('プレイヤー1 の勝利！')).toBeInTheDocument();
    
    // スコアと正解のお題
    expect(screen.getByText('3800 pt')).toBeInTheDocument();
    expect(screen.getByText('りんご')).toBeInTheDocument();
  });
});
