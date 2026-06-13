// popup-redesigns.jsx — three redesigns of the level-details pop-up (real content: level 1 "First Steps").
// P1: refined dialog · P2: stakes-first · P3: duel ticket.

const FIRSTSTEPS = { n: 1, name: 'First Steps', sub: 'Learn the ropes on a small board.' };
const FS_CHALLENGE = [
  { value: '10', label: 'dots' },
  { value: 'Easy', label: 'rival AI' },
  { value: 'You', label: 'start first' },
];

// solid lavender CTA matching the original pop-up
function LavenderCTA({ label = 'Start duel' }) {
  return (
    <button style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '17px 0', borderRadius: 999, fontFamily: 'Poppins', fontWeight: 800, fontSize: 18, color: '#1a1140', background: 'linear-gradient(180deg, #CDBBFF, #A78BFA)', boxShadow: '0 14px 38px -8px rgba(167,139,250,0.7), 0 0 24px rgba(167,139,250,0.35)' }}>
      {label}
    </button>
  );
}

function PopBack() {
  const C = window.COSMIC;
  return <div style={{ textAlign: 'center', fontSize: 15.5, fontWeight: 700, color: C.muted, padding: '16px 0 2px', cursor: 'pointer' }}>Back to map</div>;
}

function PopPill({ children }) {
  const C = window.COSMIC;
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.borderHi}`, background: 'rgba(167,139,250,0.10)', fontSize: 12, fontWeight: 800, letterSpacing: 2, color: C.violetBright }}>{children}</span>
  );
}

// ── P1 · Refined dialog — same paradigm, tighter hierarchy ──
function PopupDialog() {
  const C = window.COSMIC;
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text }}>
      <GhostMap />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 22px' }}>
        <div style={{ width: '100%', borderRadius: 30, padding: '26px 24px 24px', background: 'linear-gradient(180deg, #241b52, #141031)', border: `1px solid ${C.borderHi}`, boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8), 0 0 60px -12px rgba(167,139,250,0.35)' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <PopPill>LEVEL 1 OF 20</PopPill>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: C.muted, cursor: 'pointer' }}>✕</div>
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, color: '#fff', marginTop: 14 }}>{FIRSTSTEPS.name}</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{FIRSTSTEPS.sub}</div>

          {/* challenge → labeled stat cells instead of bare chips */}
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 2, color: C.faint, margin: '22px 0 10px' }}>CHALLENGE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {FS_CHALLENGE.map((s, i) => (
              <div key={i} style={{ borderRadius: 16, padding: '13px 6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* bank note → visual 6-slot meter */}
          <div style={{ marginTop: 14, padding: '13px 15px', borderRadius: 16, background: 'rgba(255,197,61,0.06)', border: '1px solid rgba(255,197,61,0.22)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,197,61,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bolt size={16} /></div>
            <div style={{ minWidth: 0 }}>
              <BankMeter filled={0} size={15} gap={4} />
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Earn <b style={{ color: C.gold, fontWeight: 700 }}>6★</b> to unlock the extra-roll power</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}><LavenderCTA /></div>
          <PopBack />
        </div>
      </div>
    </div>
  );
}

// ── P2 · Stakes-first — leads with the 3 earnable stars ─────
function PopupStakes() {
  const C = window.COSMIC;
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text }}>
      <GhostMap />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 22px' }}>
        <div style={{ width: '100%', borderRadius: 30, padding: '30px 24px 24px', background: 'linear-gradient(180deg, #241b52, #141031)', border: `1px solid ${C.border}`, boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)', textAlign: 'center' }}>
          {/* the prize, front and center */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <div style={{ transform: 'translateY(8px) rotate(-10deg)' }}><Star size={38} empty /></div>
            <Star size={48} empty />
            <div style={{ transform: 'translateY(8px) rotate(10deg)' }}><Star size={38} empty /></div>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, marginTop: 10, letterSpacing: 0.5 }}>3★ up for grabs</div>

          <div style={{ marginTop: 16 }}><PopPill>LEVEL 1 OF 20</PopPill></div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: '#fff', marginTop: 10 }}>{FIRSTSTEPS.name}</div>
          <div style={{ fontSize: 15.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{FIRSTSTEPS.sub}</div>

          {/* challenge as inline pills, like the original but with dot separators */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {['10 dots', 'Easy AI', 'You start'].map((c, i) => (
              <span key={i} style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{c}</span>
            ))}
          </div>

          {/* road to the extra roll: 6 slots ending in the reward */}
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <BankMeter filled={0} size={17} gap={6} />
            <Chevron size={13} color={C.faint} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: 'rgba(255,197,61,0.12)', border: '1px solid rgba(255,197,61,0.3)', whiteSpace: 'nowrap' }}>
              <Dice size={15} color={C.gold} /><span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>+1 roll</span>
            </div>
          </div>

          <div style={{ marginTop: 20 }}><LavenderCTA /></div>
          <PopBack />
        </div>
      </div>
    </div>
  );
}

// ── P3 · Duel ticket — admission stub for the match ─────────
function PopupTicket() {
  const C = window.COSMIC;
  const notch = (side) => (
    <div style={{ position: 'absolute', [side]: -12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', background: '#0a0820' }}></div>
  );
  const row = (k, v, last) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '11px 0', borderBottom: last ? 'none' : `1px dashed ${C.border}` }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 2, color: C.faint }}>{k}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{v}</span>
    </div>
  );
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text }}>
      <GhostMap />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px' }}>
        <div style={{ borderRadius: 26, overflow: 'visible', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8), 0 0 50px -12px rgba(167,139,250,0.3)' }}>
          {/* stub */}
          <div style={{ borderRadius: '26px 26px 0 0', padding: '22px 24px 18px', background: 'linear-gradient(135deg, #2c2161, #1a1342)', border: `1px solid ${C.borderHi}`, borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: C.violetBright }}>DUEL ADMISSION</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, color: '#fff', marginTop: 4 }}>{FIRSTSTEPS.name}</div>
              <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>{FIRSTSTEPS.sub}</div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0, paddingLeft: 14 }}>
              <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: '#fff' }}>01</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, color: C.faint, marginTop: 2 }}>OF 20</div>
            </div>
          </div>
          {/* perforation */}
          <div style={{ position: 'relative', background: '#181238', borderLeft: `1px solid ${C.borderHi}`, borderRight: `1px solid ${C.borderHi}`, padding: '0 24px' }}>
            <div style={{ borderTop: `2px dashed rgba(160,140,255,0.3)` }}></div>
            {notch('left')}{notch('right')}
          </div>
          {/* body */}
          <div style={{ borderRadius: '0 0 26px 26px', padding: '6px 24px 22px', background: 'linear-gradient(180deg, #181238, #110d2c)', border: `1px solid ${C.borderHi}`, borderTop: 'none' }}>
            {row('BOARD', '10 dots')}
            {row('RIVAL', 'Easy AI')}
            {row('OPENER', 'You start', true)}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,197,61,0.06)', border: '1px solid rgba(255,197,61,0.2)' }}>
              <BankMeter filled={0} size={15} gap={4} />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.gold, whiteSpace: 'nowrap' }}>6★ → +1 roll</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}><LavenderCTA /></div>
        <PopBack />
      </div>
    </div>
  );
}

Object.assign(window, { PopupDialog, PopupStakes, PopupTicket });
