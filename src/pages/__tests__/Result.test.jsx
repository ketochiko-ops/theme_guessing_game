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
    const p1TimeUsed = 10000;
    
    // スコア計算式: (残りライフ × 1000) - (経過時間(秒) × 1) - (質問数 × 10)
    // ライフ: 4 -> 4000
    // 経過: 10秒 -> 10
    // 質問: 2回 -> 20
    // スコア = 4000 - 10 - 20 = 3970
    const mockGameState = {
      room: {
        state: 'finished',
        theme: 'りんご',
        winner: 'p1',
        p1_lives: 4,
        p1_questions: 2,
        p1_time_used: p1TimeUsed,
        last_update: Date.now()
      }
    };

    renderWithContext(mockGameState, 'p1');

    // 勝者のテキスト
    expect(screen.getByText('プレイヤー1 の勝利！')).toBeInTheDocument();
    
    // スコアと正解のお題
    expect(screen.getByText('3970 pt')).toBeInTheDocument();
    expect(screen.getByText('りんご')).toBeInTheDocument();
  });
});
