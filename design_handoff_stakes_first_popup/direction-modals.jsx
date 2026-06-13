// direction-modals.jsx — three redesigns of the pre-duel briefing for duel #5 "Capped".
// M1: bottom sheet · M2: centered versus-card · M3: full-screen takeover.

const DUEL5 = { n: 5, name: 'Capped', twist: 'Your roll is capped at 3 lines a turn.' };
const CHALLENGE = [
  { value: '14', label: 'dots' },
  { value: 'MED', label: 'rival AI' },
  { value: '3', label: 'lines / turn' },
];

// dimmed ghost of the campaign map behind modals
function GhostMap() {
  const C = window.COSMIC;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden' }}>
      <StarField />
      <div style={{ position: 'absolute', top: 70, left: 26, width: 180, height: 26, borderRadius: 8, background: 'rgba(167,139,250,0.10)' }}></div>
      <div style={{ position: 'absolute', top: 116, left: 26, right: 26, height: 90, borderRadius: 22, background: 'rgba(167,139,250,0.07)' }}></div>
      <div style={{ position: 'absolute', top: 240, left: 64, right: 64, height: 320, borderRadius: 30, background: 'rgba(167,139,250,0.06)' }}></div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,5,18,0.72)', backdropFilter: 'blur(3px)' }}></div>
    </div>
  );
}

function LevelPill({ children }) {
  const C = window.COSMIC;
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.borderHi}`, background: 'rgba(167,139,250,0.10)', fontSize: 12, fontWeight: 800, letterSpacing: 2, color: C.violetBright }}>{children}</span>
  );
}

function StatCells({ compact = false }) {
  const C = window.COSMIC;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      {CHALLENGE.map((s, i) => (
        <div key={i} style={{ borderRadius: 16, padding: compact ? '10px 8px' : '14px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: compact ? 20 : 24, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{s.value}</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: C.muted, marginTop: 3 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function BankStrip() {
  const C = window.COSMIC;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,197,61,0.07)', border: '1px solid rgba(255,197,61,0.22)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#A78BFA,#7C5CFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Dice size={19} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <BankMeter size={15} gap={4} />
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, whiteSpace: 'nowrap' }}>{TO_NEXT}★ here banks an extra dice roll</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, background: 'rgba(255,197,61,0.12)', border: '1px solid rgba(255,197,61,0.3)', flexShrink: 0 }}>
        <Bolt size={12} /><span style={{ fontSize: 12.5, fontWeight: 800, color: C.gold }}>×{BANKED_ROLLS}</span>
      </div>
    </div>
  );
}

function StartButton({ label = 'Start duel' }) {
  const C = window.COSMIC;
  return (
    <button style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '17px 0', borderRadius: 999, fontFamily: 'Poppins', fontWeight: 800, fontSize: 17.5, color: '#1a1140', background: C.gradDiag, boxShadow: '0 14px 34px -8px rgba(167,139,250,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
      {label} <Chevron size={16} color="#1a1140" />
    </button>
  );
}

function BackLink({ label = 'Back to map' }) {
  const C = window.COSMIC;
  return <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: C.muted, padding: '16px 0 4px', cursor: 'pointer' }}>{label}</div>;
}

// ── M1 · Bottom sheet ───────────────────────────────────────
function ModalSheet() {
  const C = window.COSMIC;
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text }}>
      <GhostMap />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: '30px 30px 0 0', background: 'linear-gradient(180deg, #221a4e, #131030)', border: `1px solid ${C.border}`, borderBottom: 'none', padding: '12px 24px 30px', boxShadow: '0 -30px 80px -20px rgba(124,92,255,0.45)' }}>
        <div style={{ width: 42, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 22px' }}></div>
        <LevelPill>DUEL 5 OF 20</LevelPill>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, color: '#fff', marginTop: 12 }}>Capped</div>
        <div style={{ fontSize: 16, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{DUEL5.twist}</div>

        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 2, color: C.faint, margin: '22px 0 10px' }}>THE CHALLENGE</div>
        <StatCells />

        <div style={{ marginTop: 14 }}><BankStrip /></div>

        <div style={{ marginTop: 20 }}><StartButton /></div>
        <BackLink />
      </div>
    </div>
  );
}

// ── M2 · Centered versus-card ───────────────────────────────
function ModalVersus() {
  const C = window.COSMIC;
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text }}>
      <GhostMap />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', borderRadius: 30, padding: 2, background: C.gradDiag, boxShadow: '0 30px 90px -20px rgba(124,92,255,0.7)' }}>
          <div style={{ borderRadius: 28, padding: '28px 24px 24px', background: 'linear-gradient(180deg, #1f1846, #120e2e)', textAlign: 'center' }}>
            {/* you vs rival */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(91,224,230,0.12)', border: '1.5px solid rgba(91,224,230,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dice size={26} color={C.cyan} /></div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: C.faint }}>VS</div>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(244,114,182,0.10)', border: '1.5px solid rgba(244,114,182,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: C.pink }}>5</div>
            </div>
            <div style={{ marginTop: 16 }}><LevelPill>DUEL 5 OF 20</LevelPill></div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: '#fff', marginTop: 10 }}>Capped</div>

            {/* twist callout */}
            <div style={{ margin: '14px 0 0', padding: '13px 16px', borderRadius: 16, background: 'rgba(167,139,250,0.08)', border: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left' }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}><Bolt size={15} /></div>
              <div style={{ fontSize: 14, lineHeight: 1.45, color: C.muted }}><b style={{ color: '#fff', fontWeight: 700 }}>Twist:</b> {DUEL5.twist}</div>
            </div>

            <div style={{ marginTop: 14 }}><StatCells compact /></div>

            {/* what's at stake */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <DuelStars earned={0} size={19} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>up for grabs</span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: C.gold, whiteSpace: 'nowrap' }}>{TO_NEXT}★ banks a roll</span>
            </div>

            <div style={{ marginTop: 18 }}><StartButton /></div>
            <BackLink />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── M3 · Full-screen takeover ───────────────────────────────
function ModalTakeover() {
  const C = window.COSMIC;
  const row = (icon, title, sub, last) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
  return (
    <div style={{ position: 'relative', height: '100%', fontFamily: 'Poppins, system-ui', color: C.text, background: C.bg, overflow: 'hidden' }}>
      <StarField />
      {/* ghost numeral */}
      <div style={{ position: 'absolute', top: -40, right: -50, fontSize: 380, fontWeight: 800, color: 'rgba(167,139,250,0.07)', lineHeight: 1, pointerEvents: 'none' }}>5</div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '58px 26px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 15, fontWeight: 600 }}>
          <Chevron size={16} color={C.muted} dir="left" /> Map
        </div>

        <div style={{ marginTop: 36 }}><LevelPill>DUEL 5 OF 20</LevelPill></div>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2, color: '#fff', marginTop: 12, lineHeight: 1 }}>Capped</div>
        <div style={{ fontSize: 17, color: C.muted, marginTop: 12, lineHeight: 1.5, maxWidth: 300, textWrap: 'pretty' }}>{DUEL5.twist}</div>

        <div style={{ marginTop: 34 }}>
          {row(<span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>14</span>, '14 dots on the board', 'A bigger grid than last duel')}
          {row(<Dice size={20} color={C.violetBright} />, 'Medium rival AI', 'It blocks, but it can be baited')}
          {row(<Bolt size={17} color={C.violetBright} />, 'Max 3 lines a turn', 'The twist — plan around the cap', true)}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <BankStrip />
          <div style={{ marginTop: 16 }}><StartButton label="Start duel" /></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModalSheet, ModalVersus, ModalTakeover, GhostMap });
