// The shared ranking. On the end screen (with a score) it asks for a name once and sends the score;
// opened from the trophy button (no score) it only shows the top players.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { STRINGS } from '../ui/strings';
import { fetchCount, fetchRank, fetchTop, RejectedError, submitScore, type RankedScore } from './api';
import { LEADERBOARD } from './config';
import { nameIsClean } from './names';
import { cleanName, loadPlayer, savePlayer, type Player } from './player';

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * `daily`: the day's challenge, where the place reads "7th of 23" and is reported with `onPlaced`
 * (for the share text).
 */
export function Leaderboard({ ranking, score, daily = false, onPlaced }: {
  ranking: string; score?: number; daily?: boolean; onPlaced?: (rank: number, total: number) => void;
}) {
  const T = STRINGS.leaderboard;
  const [player, setPlayer] = useState<Player | null>(loadPlayer);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player?.name ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [top, setTop] = useState<readonly RankedScore[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [nameRefused, setNameRefused] = useState(false);
  /** The server kept this score out (too many in a row, or a refused name). */
  const [scoreRefused, setScoreRefused] = useState(false);
  /** This game's score is sent once, whatever happens to the screen. */
  const sent = useRef(false);

  const sync = async (who: Player | null) => {
    setStatus('loading');
    try {
      if (who && score && score > 0 && !sent.current) {
        // Marked before sending, so a second call meanwhile can't send it twice.
        sent.current = true;
        await submitScore(ranking, who.id, who.name, score).catch((error: unknown) => {
          if (error instanceof RejectedError) { setScoreRefused(true); return; }
          sent.current = false;
          throw error;
        });
      }
      const [list, place, count] = await Promise.all([
        fetchTop(ranking, LEADERBOARD.topCount),
        score && score > 0 ? fetchRank(ranking, score) : null,
        daily ? fetchCount(ranking) : null,
      ]);
      setTop(list);
      setRank(place);
      setTotal(count);
      if (place !== null && count !== null && sent.current) onPlaced?.(place, Math.max(place, count));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  // A known player's score goes straight in; a new player first picks a name.
  useEffect(() => {
    void sync(player);
    // Once per end screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    if (!cleanName(draft)) return;
    if (!nameIsClean(draft)) { setNameRefused(true); return; }
    const saved = savePlayer(draft, player);
    setPlayer(saved);
    setEditing(false);
    void sync(saved);
  };

  const askName = editing || (!player && score !== undefined);
  return (
    <section className="leaderboard" aria-label={T.title}>
      {score !== undefined && <h3>{T.title}</h3>}
      {askName ? (
        <form className="lb-name" onSubmit={saveName}>
          <label htmlFor="lb-name">{player ? T.changeName : T.askName}</label>
          <div>
            <input
              id="lb-name"
              value={draft}
              maxLength={LEADERBOARD.maxNameLength}
              autoComplete="nickname"
              enterKeyHint="done"
              placeholder={T.namePlaceholder}
              onChange={(e) => { setDraft(e.target.value); setNameRefused(false); }}
            />
            <button type="submit" disabled={!cleanName(draft)}>{T.save}</button>
          </div>
          {nameRefused && <p className="lb-error">{T.badName}</p>}
        </form>
      ) : player && (
        <p className="lb-player">
          {T.playingAs} <strong>{player.name}</strong>{' '}
          <button type="button" className="link-btn" onClick={() => { setDraft(player.name); setEditing(true); }}>{T.edit}</button>
        </p>
      )}
      {status === 'loading' && <p className="lb-note">{T.loading}</p>}
      {status === 'error' && (
        <p className="lb-note">
          {T.offline} <button type="button" className="link-btn" onClick={() => void sync(player)}>{T.retry}</button>
        </p>
      )}
      {scoreRefused && <p className="lb-note">{T.refused}</p>}
      {status === 'done' && rank !== null && player && sent.current && !scoreRefused && (
        <p className="lb-rank">{daily && total !== null ? T.dailyRank(rank, Math.max(rank, total)) : T.rank(rank)}</p>
      )}
      {status === 'done' && (top.length ? (
        <ol className="lb-list">
          {top.map((row, i) => (
            <li key={row.playerId} className={row.playerId === player?.id ? 'me' : undefined}>
              <span className="lb-pos">{i + 1}</span>
              <span className="lb-who">{row.name}</span>
              <span className="lb-score">{row.score.toLocaleString('ca')}</span>
            </li>
          ))}
        </ol>
      ) : <p className="lb-note">{T.empty}</p>)}
    </section>
  );
}
