import { useEffect, useState } from 'react';
import { useGame } from '../../GameContext';
import { PlayerCards } from '../../types';
import { TimerIcon } from '../Icons';

const CARD_ORDER = ['profession', 'health', 'hobby', 'luggage', 'phobia', 'skill', 'biology', 'extra'] as const;
const CARD_LABELS: Record<string, string> = {
  profession: 'Профессия',
  health: 'Здоровье',
  hobby: 'Хобби / Увлечение',
  luggage: 'Крупный инвентарь',
  phobia: 'Фобия / Страх',
  skill: 'Навык',
  biology: 'Пол / Возраст',
  extra: 'Дополнительное сведение',
};

function TimerBadge({ timerEndAt }: { timerEndAt: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  if (!timerEndAt) return null;
  const left = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="glass" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80, borderRadius: 12, border: '1px solid rgba(212,175,55,0.5)' }}>
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <TimerIcon style={{ width: 16, height: 16, color: left === 0 ? '#888' : '#d4af37' }} />
        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: left === 0 ? '#888' : '#d4af37' }}>{mm}:{ss}</span>
      </div>
    </div>
  );
}

function VotingBlock() {
  const { room, myPlayerId, vote } = useGame();
  if (!room) return null;
  const votingOpen = room.votingActive || room.phase === 'voting';
  if (!votingOpen) return null;

  const active = room.players.filter((p) => !p.isEliminated);
  const voted = Object.keys(room.votes).length;
  const notVoted = active.length - voted;
  const votesByTarget: Record<string, string[]> = {};

  Object.entries(room.votes).forEach(([voterId, targetId]) => {
    const voter = room.players.find((p) => p.id === voterId);
    if (!votesByTarget[targetId]) votesByTarget[targetId] = [];
    if (voter) votesByTarget[targetId].push(voter.name);
  });

  const handleVote = async (targetId: string) => {
    const res = await vote(targetId);
    if (res?.error) alert(res.error);
  };

  return (
    <div className="glass" style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 20 }}>
        <div style={{ color: '#2ecc71' }}>Проголосовало: {voted}</div>
        <div style={{ color: '#e74c3c' }}>Не проголосовало: {notVoted}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Игрок</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Голосов</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Кто голосовал</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Действие</th>
          </tr>
        </thead>
        <tbody>
          {active.map((p, i) => {
            const list = votesByTarget[p.id] || [];
            const canVote = p.id !== myPlayerId && !(myPlayerId && myPlayerId in room.votes);
            return (
              <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: 10 }}>{p.name}</td>
                <td style={{ padding: 10, fontWeight: 700 }}>{list.length}</td>
                <td style={{ padding: 10, color: '#aaa' }}>{list.join(', ') || '-'}</td>
                <td style={{ padding: 10 }}>
                  {canVote ? <button className="btn btn-accent" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleVote(p.id)}>Голосовать</button> : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FunActions() {
  const { room, myPlayerId, funAction } = useGame();
  const [target, setTarget] = useState('');
  if (!room) return null;
  const actions = [
    'Закидать говном',
    'Крикнуть: ты не пройдешь в бункер',
    'Устроить абсурдный допрос',
    'Сказать: у тебя рюкзак из секс-шопа',
    'Потребовать раскрыть страх прямо сейчас',
  ];

  const run = async (text: string) => {
    if (!target) return alert('Выберите игрока');
    const res = await funAction(target, text);
    if (res?.error) alert(res.error);
  };

  return (
    <div className="glass" style={{ borderRadius: 12, padding: 12, marginTop: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>Доп. возможности (весело)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 8 }}>
        <select className="input" style={{ padding: 8, fontSize: 12 }} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Выберите игрока</option>
          {room.players.filter((p) => p.id !== myPlayerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {actions.map((a) => <button key={a} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => run(a)}>{a}</button>)}
        </div>
      </div>
    </div>
  );
}

export default function GameScreen() {
  const { room, myPlayerId, playerRevealCard, playerHideCard, endTurn } = useGame();
  if (!room) return null;

  const me = room.players.find((p) => p.id === myPlayerId);
  const activeCount = room.players.filter((p) => !p.isEliminated).length;

  const [introOpen, setIntroOpen] = useState(room.phase === 'catastrophe');
  const [introFrame, setIntroFrame] = useState(0);
  const introImages = ['/images/nuclear.jpg', '/images/pandemic.jpg', '/images/asteroid.jpg', '/images/ai.jpg', '/images/climate.jpg', '/images/zombie.jpg'];

  useEffect(() => {
    if (room.phase !== 'catastrophe') return;
    setIntroOpen(true);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setIntroFrame(i % introImages.length);
    }, 260);
    const done = setTimeout(() => {
      clearInterval(iv);
      setIntroOpen(false);
    }, 2600);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
    };
  }, [room.phase]);

  const handleEndTurn = async () => {
    const res = await endTurn();
    if (res?.error) alert(res.error);
  };

  return (
    <div style={{ paddingBottom: room.timerEndAt ? 80 : 20 }}>
      <TimerBadge timerEndAt={room.timerEndAt} />

      {introOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#000' }}>
          <img src={introImages[introFrame] || room.catastrophe.image || '/bunker-bg.jpg'} alt="intro" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'translate(-6%, 6%) scale(1.08)', transition: 'transform .45s ease' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.85))' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
            <div>
              <div style={{ fontSize: 50, fontWeight: 900 }}>{room.catastrophe.name}</div>
              <div style={{ fontSize: 20, color: '#ddd', maxWidth: 920, marginTop: 12 }}>{room.catastrophe.description}</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <img src={room.catastrophe.image || '/bunker-bg.jpg'} alt="cat" style={{ width: '100%', height: 240, objectFit: 'cover' }} />
        <div style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{room.catastrophe.name}</div>
          <div style={{ color: '#ddd', fontSize: 16, maxWidth: 980, margin: '8px auto 0' }}>{room.catastrophe.description}</div>
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ textAlign: 'center', fontWeight: 800, marginBottom: 6 }}>Информация о бункере</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, color: '#ddd', flexWrap: 'wrap' }}>
          <span>Мест: <b style={{ color: '#d4af37' }}>{room.settings.bunkerCapacity}</b></span>
          <span>Желающих: <b>{activeCount}</b></span>
          <span>Фильтры: <b>Изношены</b></span>
          <span>Еда и вода: <b>На 2 года</b></span>
        </div>
      </div>

      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4af37', textAlign: 'center', fontWeight: 700 }}>
          Мои характеристики {me ? `— ${me.name}` : ''}
        </div>
        {me?.cards && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,0.07)' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Характеристика</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Значение</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {CARD_ORDER.map((k) => {
                const c = (me.cards as PlayerCards)[k];
                return (
                  <tr key={k} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 12 }}>{c.label}</td>
                    <td style={{ padding: 12 }}>{c.value || '-'}</td>
                    <td style={{ padding: 12 }}>
                      {c.revealed ? (
                        <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => playerHideCard(k)}>Скрыть</button>
                      ) : (
                        <button className="btn btn-accent" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => playerRevealCard(k)}>Раскрыть</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {room.phase === 'game' && room.currentSpeaker === myPlayerId && (
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="btn btn-accent" style={{ padding: '8px 12px', fontSize: 13 }} onClick={handleEndTurn}>Завершить ход</button>
            <span style={{ marginLeft: 10, fontSize: 12, color: '#aaa' }}>Нужно открыть Профессию и ещё 1 карту</span>
          </div>
        )}
      </div>

      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontWeight: 700 }}>События / Игроки ({room.players.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Имя</th>
              {CARD_ORDER.map((k) => <th key={k} style={{ padding: 10, textAlign: 'left', fontSize: 12 }}>{CARD_LABELS[k]}</th>)}
            </tr>
          </thead>
          <tbody>
            {room.players.map((p, i) => (
              <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)', background: p.id === myPlayerId ? 'rgba(212,175,55,0.06)' : 'transparent' }}>
                <td style={{ padding: 10, fontWeight: 600, textDecoration: p.isEliminated ? 'line-through' : 'none', textDecorationColor: '#000', textDecorationThickness: '3px', color: p.isEliminated ? '#777' : '#fff' }}>
                  {p.name}{p.id === myPlayerId ? ' (вы)' : ''}
                </td>
                {CARD_ORDER.map((k) => {
                  const c = p.cards ? (p.cards as PlayerCards)[k] : null;
                  return <td key={k} style={{ padding: 10, color: c?.revealed ? '#fff' : '#666' }}>{c?.revealed ? c.value : '???'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <VotingBlock />
      <FunActions />

      {room.gameLog?.length > 0 && (
        <div className="glass" style={{ borderRadius: 12, marginTop: 12, padding: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>События</div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'grid', gap: 6 }}>
            {[...room.gameLog].slice(-12).reverse().map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: '#aaa' }}>
                {new Date(l.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {l.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
