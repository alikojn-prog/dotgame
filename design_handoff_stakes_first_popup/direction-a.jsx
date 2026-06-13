// direction-a.jsx — Refined Carousel. Keeps the swipe paradigm, premium polish.

function StarField({ n = 26, seed = 1 }) {
  // deterministic faint star dots
  const dots = [];
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < n; i++) {
    const sz = rnd() < 0.8 ? 1.5 : 2.5;
    dots.push({ x: rnd() * 100, y: rnd() * 100, sz, o: 0.15 + rnd() * 0.45 });
  }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
          width: d.sz, height: d.sz, borderRadius: '50%',
          background: '#fff', opacity: d.o,
        }} />
      ))}
    </div>
  );
}

function CarouselCard({ duel, role }) {
  const C = window.COSMIC;
  const active = role === 'active';
  const cleared = duel.status === 'cleared';
  const locked = duel.status === 'locked';

  let tx = 0, scale = 1, op = 1, blur = 0, z = 3, top = 0;
  if (role === 'left') { tx = -182; scale = 0.8; op = 0.4; blur = 2.5; z = 1; top = 22; }
  if (role === 'right') { tx = 182; scale = 0.8; op = 0.4; blur = 2.5; z = 1; top = 22; }

  const badge = cleared
    ? <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#A78BFA,#7C5CFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(124,92,255,0.45)' }}><Check size={30} /></div>
    : locked
      ? <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={26} /></div>
      : <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(167,139,250,0.12)', border: `1.5px solid ${C.borderHi}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#fff' }}>{duel.n}</div>;

  const cta = cleared
    ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.violetBright, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>REPLAY <Chevron size={13} color={C.violetBright} /></div>
    : locked
      ? <span style={{ color: C.faint, fontWeight: 700, fontSize: 13, letterSpacing: 1.5 }}>LOCKED</span>
      : <button style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '13px 34px', borderRadius: 999, fontFamily: 'Poppins', fontWeight: 800, fontSize: 16, color: '#1a1140', background: C.gradDiag, boxShadow: '0 10px 26px -6px rgba(167,139,250,0.6)' }}>Play <Chevron size={15} color="#1a1140" /></button>;

  return (
    <div style={{
      position: 'absolute', top, left: '50%',
      transform: `translateX(-50%) translateX(${tx}px) scale(${scale})`,
      transformOrigin: 'top center',
      width: 244, zIndex: z, opacity: op, filter: blur ? `blur(${blur}px)` : 'none',
      transition: 'transform .45s cubic-bezier(.4,0,.2,1), opacity .45s, filter .45s',
      pointerEvents: active ? 'auto' : 'none',
    }}>
      <div style={{
        borderRadius: 30, padding: '32px 26px 26px',
        background: active ? 'linear-gradient(180deg, rgba(50,40,98,0.96), rgba(26,20,58,0.98))' : 'rgba(30,24,66,0.92)',
        border: `1.5px solid ${active ? C.borderHi : C.border}`,
        boxShadow: active ? '0 0 0 1px rgba(167,139,250,0.25), 0 30px 70px -20px rgba(124,92,255,0.6), 0 0 60px -10px rgba(167,139,250,0.4)' : '0 18px 40px -16px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        {badge}
        <div style={{ marginTop: 20, fontSize: 25, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>{duel.n}. {duel.name}</div>
        <div style={{ marginTop: 9, fontSize: 15, lineHeight: 1.42, color: locked ? C.faint : C.muted, maxWidth: 200, textWrap: 'pretty', minHeight: 42 }}>
          {locked ? 'Clear the previous duel to unlock.' : duel.twist}
        </div>
        <div style={{ marginTop: 18 }}>
          {duel.status !== 'locked' && <DuelStars earned={duel.stars} size={20} />}
        </div>
        <div style={{ marginTop: 18 }}>{cta}</div>
      </div>
    </div>
  );
}

function DirectionA() {
  const C = window.COSMIC;
  const [idx, setIdx] = React.useState(4); // duel #5
  const d = DUELS[idx];

  return (
    <div style={{ position: 'relative', height: '100%', background: C.bg, color: C.text, fontFamily: 'Poppins, system-ui', overflow: 'hidden' }}>
      <StarField />
      {/* header */}
      <div style={{ position: 'relative', padding: '58px 26px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 15, fontWeight: 600 }}>
          <Chevron size={16} color={C.muted} dir="left" /> Back
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginTop: 6 }}>Campaign</div>
        <div style={{ fontSize: 15, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>20 duels. Beat the rival to unlock the next.</div>
      </div>

      {/* economy / dice-bank card */}
      <div style={{ position: 'relative', margin: '18px 26px 0', padding: '16px 18px', borderRadius: 22, background: 'rgba(30,24,66,0.92)', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#A78BFA,#7C5CFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(124,92,255,0.4)' }}>
            <Dice size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>Dice-Roll Bank</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{TO_NEXT}★ more banks your next extra roll</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: 'rgba(255,197,61,0.12)', border: '1px solid rgba(255,197,61,0.3)' }}>
            <Bolt size={13} />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: C.gold }}>×{BANKED_ROLLS}</span>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <BankMeter size={19} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.faint }}>{CLEARED}/20 cleared</span>
        </div>
      </div>

      {/* carousel */}
      <div style={{ position: 'relative', height: 396, marginTop: 22 }}>
        {idx > 0 && <CarouselCard duel={DUELS[idx - 1]} role="left" />}
        {idx < DUELS.length - 1 && <CarouselCard duel={DUELS[idx + 1]} role="right" />}
        <CarouselCard duel={d} role="active" />
      </div>

      {/* dots */}
      <div style={{ position: 'absolute', bottom: 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 7, padding: '0 20px', flexWrap: 'wrap' }}>
        {DUELS.map((du, i) => {
          const isCur = i === idx;
          const done = du.status === 'cleared';
          return (
            <div key={i} onClick={() => setIdx(i)} style={{
              width: isCur ? 22 : 7, height: 7, borderRadius: 999, cursor: 'pointer',
              background: isCur ? C.grad : done ? C.gold : C.faint,
              opacity: isCur ? 1 : done ? 0.85 : 0.5, transition: 'all .3s',
            }} />
          );
        })}
      </div>
    </div>
  );
}

window.DirectionA = DirectionA;
window.StarField = StarField;
