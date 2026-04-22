import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Player from '../Player';
import { SocketContext } from '../../App';

describe('Player Component', () => {
  const renderWithContext = (gameState, role) => {
    // スクロール処理のモック (jsdom は scrollIntoView を内包していないため)
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    return render(
      <SocketContext.Provider value={{ socket: { emit: vi.fn() }, gameState, role }}>
        <MemoryRouter>
          <Player />
        </MemoryRouter>
      </SocketContext.Provider>
    );
  };

  it('自分のターンの場合、黄色いハイライトとバッジが表示され、入力が有効になること', () => {
    const mockGameState = {
      room: {
        state: 'playing',
        current_turn: 'p1',
        p1_lives: 5,
        p2_lives: 5
      },
      logs: []
    };

    renderWithContext(mockGameState, 'p1');

    // 「🔔 あなたのターンです！」が表示される
    expect(screen.getByText('🔔 あなたのターンです！')).toBeInTheDocument();
    
    // 背景色が設定されるクラスがあること
    const container = screen.getByText('🔔 あなたのターンです！').closest('.card.p-4');
    expect(container).toHaveClass('bg-warning');

    // 質問用入力ボックスが有効であること
    const input = screen.getByPlaceholderText('GMに質問する (例: 食べ物ですか？)');
    expect(input).not.toBeDisabled();
    
    // パスボタンが有効であること
    const passButton = screen.getByText('パス (ターン終了)');
    expect(passButton).not.toBeDisabled();
  });

  it('相手のターンの場合、入力が無効になること', () => {
    const mockGameState = {
      room: {
        state: 'playing',
        current_turn: 'p2', // 相手(P2)のターン
        p1_lives: 5,
        p2_lives: 5
      },
      logs: []
    };

    renderWithContext(mockGameState, 'p1'); // 自分はP1

    // 「相手のターンを待っています」が表示される
    expect(screen.getByText('相手のターンを待っています')).toBeInTheDocument();
    
    // 背景クラスがないこと
    const container = screen.getByText('相手のターンを待っています').closest('.card.p-4');
    expect(container).not.toHaveClass('bg-warning');

    // リソース保護: 質問用入力ボックスが無効であること
    const input = screen.getByPlaceholderText('GMに質問する (例: 食べ物ですか？)');
    expect(input).toBeDisabled();
  });
});
