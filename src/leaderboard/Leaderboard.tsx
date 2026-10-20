// The shared ranking. On the end screen (with a score) it asks for a name once and sends the score;
// opened from the trophy button (no score) it only shows the top players.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { STRINGS } from '../ui/strings';
import { fetchRank, fetchTop, submitScore, type RankedScore } from './api';
import { LEADERBOARD } from './config';
import { cleanName, loadPlayer, savePlayer, type Player } from './player';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function Leaderboard({ ranking, score }: { ranking: string; score?: number }) {
  const T = STRINGS.leaderboard;
  const [player, setPlayer] = useState<Player | null>(loadPlayer);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player?.name ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [top, setTop] = useState<readonly RankedScore[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  /** This game's score is sent once, whatever happens to the screen. */
  const sent = useRef(false);

  const sync = async (who: Player | null) => {
    setStatus('loading');
    try {
      if (who && score && score > 0 && !sent.current) {
        // Marked before sending, so a second call meanwhile can't send it twice.
        sent.current = true;
        await submitScore(ranking, who.id, who.name, score).catch((error: unknown) => { sent.current = false; throw error; });
      }
      const [list, place] = await Promise.all([fetchTop(ranking, LEADERBOARD.topCount), score && score > 0 ? fetchRank(ranking, score) : null]);
      setTop(list);
      setRank(place);
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
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" disabled={!cleanName(draft)}>{T.save}</button>
          </div>
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
      {status === 'done' && rank !== null && player && sent.current && <p className="lb-rank">{T.rank(rank)}</p>}
      {status === 'done' && (top.length ? (
        <ol className="lb-list">
          {top.map((row, i) => (
            <li key={row.playerId} className={row.playerId === player?.id ? 'me' : undefined}>
              <span className="lb-pos">{i + 1}</span>
              <span className="lb-who">{row.name}</span>
              <span className="lb-score">{row.score}</span>
            </li>
          ))}
        </ol>
      ) : <p className="lb-note">{T.empty}</p>)}
    </section>
  );
}
