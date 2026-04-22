import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Top from '../Top';
import { SocketContext } from '../../App';

describe('Top Component', () => {
  beforeEach(() => {
    // fetchのモックを設定
    global.fetch = vi.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(`表示フラグ,日時,カテゴリ,内容\n1,2026-04-20,テスト,テストお知らせ\n0,2026-04-21,非表示,見えないテキスト`),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderTop = () => {
    return render(
      <SocketContext.Provider value={{ socket: { emit: vi.fn() }, setRole: vi.fn() }}>
        <MemoryRouter>
          <Top />
        </MemoryRouter>
      </SocketContext.Provider>
    );
  };

  it('初期レンダリング時、ルームIDがないため入室ボタンは無効であること', () => {
    renderTop();
    const submitBtn = screen.getByRole('button', { name: /ルームに参加/i });
    expect(submitBtn).toBeDisabled();
  });

  it('fetch を通じてお知らせが抽出・表示されること', async () => {
    renderTop();
    
    // 表示フラグ1のものが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText('テストお知らせ')).toBeInTheDocument();
    });

    // 表示フラグ0のものは表示されない
    expect(screen.queryByText('見えないテキスト')).not.toBeInTheDocument();
  });
});
