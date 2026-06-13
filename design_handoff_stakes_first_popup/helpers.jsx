// helpers.jsx — shared cosmic tokens, icons, data, and the star-bank meter.
// Exported to window for the three direction files.

const COSMIC = {
  bg: 'radial-gradient(125% 95% at 50% -10%, #1d1547 0%, #100c2c 52%, #07061a 100%)',
  card: 'rgba(34,27,72,0.62)',
  cardHi: 'rgba(46,37,92,0.72)',
  border: 'rgba(160,140,255,0.16)',
  borderHi: 'rgba(167,139,250,0.55)',
  violet: '#A78BFA',
  violetBright: '#C4ABFF',
  cyan: '#5BE0E6',
  pink: '#F472B6',
  gold: '#FFC53D',
  text: '#F4F1FF',
  muted: 'rgba(206,199,240,0.62)',
  faint: 'rgba(206,199,240,0.32)',
  grad: 'linear-gradient(90deg, #5BE0E6 0%, #A78BFA 52%, #F472B6 100%)',
  gradDiag: 'linear-gradient(135deg, #5BE0E6 0%, #A78BFA 52%, #F472B6 100%)',
};

// ── icons ───────────────────────────────────────────────────
function Star({ size = 16, fill = COSMIC.gold, empty = false, glow = false }) {
  const d = 'M12 2.4l2.66 5.62 6.04.86-4.4 4.36 1.06 6.08L12 16.9 6.64 19.32l1.06-6.08-4.4-4.36 6.04-.86L12 2.4z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', filter: glow ? `drop-shadow(0 0 6px ${fill}aa)` : 'none' }}>
      <path d={d} fill={empty ? 'none' : fill} stroke={empty ? COSMIC.faint : 'none'} strokeWidth={empty ? 1.6 : 0} strokeLinejoin="round" />
    </svg>
  );
}

function Dice({ size = 22, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.9" />
      <circle cx="8.5" cy="8.5" r="1.6" fill={color} />
      <circle cx="15.5" cy="8.5" r="1.6" fill={color} />
      <circle cx="12" cy="12" r="1.6" fill={color} />
      <circle cx="8.5" cy="15.5" r="1.6" fill={color} />
      <circle cx="15.5" cy="15.5" r="1.6" fill={color} />
    </svg>
  );
}

function Lock({ size = 20, color = COSMIC.faint }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="3" stroke={color} strokeWidth="1.9" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function Check({ size = 20, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ size = 16, color = '#fff', dir = 'right' }) {
  const rot = { right: 0, left: 180, down: 90, up: -90 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M9 5l7 7-7 7" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bolt({ size = 16, color = COSMIC.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

// ── data ────────────────────────────────────────────────────
const DUELS = [
  { n: 1, name: 'First Blood', twist: 'Win a clean opener — no twists yet.', stars: 3, status: 'cleared' },
  { n: 2, name: 'Tie Breaker', twist: 'Draws now count as losses.', stars: 2, status: 'cleared' },
  { n: 3, name: 'The Gambit', twist: 'Stake a die before you roll.', stars: 2, status: 'cleared' },
  { n: 4, name: 'Sharper Rival', twist: 'The AI bot starts playing to win.', stars: 3, status: 'cleared' },
  { n: 5, name: 'Capped', twist: 'Your roll is capped at 3 lines a turn.', stars: 0, status: 'current' },
  { n: 6, name: 'Head Start', twist: 'The rival opens with a free line.', stars: 0, status: 'locked' },
  { n: 7, name: 'Fog', twist: "You can't see the rival's board.", stars: 0, status: 'locked' },
  { n: 8, name: 'Sudden Death', twist: 'First mistake ends the duel.', stars: 0, status: 'locked' },
  { n: 9, name: 'Double or Nothing', twist: 'Stars earned here count double.', stars: 0, status: 'locked' },
  { n: 10, name: 'Mirror Match', twist: 'The rival copies your last move.', stars: 0, status: 'locked' },
  { n: 11, name: 'Time Crunch', twist: 'Ten seconds a turn. No stalling.', stars: 0, status: 'locked' },
  { n: 12, name: 'Loaded Dice', twist: 'The rival rolls with weighted dice.', stars: 0, status: 'locked' },
  { n: 13, name: 'Blackout', twist: 'The board hides between turns.', stars: 0, status: 'locked' },
  { n: 14, name: 'The Heist', twist: 'Steal a line from the rival to win.', stars: 0, status: 'locked' },
  { n: 15, name: 'No Retries', twist: 'One life. Lose and start the duel over.', stars: 0, status: 'locked' },
  { n: 16, name: 'Overtime', twist: 'Tied at the buzzer? Sudden-death roll.', stars: 0, status: 'locked' },
  { n: 17, name: 'Cold Streak', twist: 'Every miss freezes a die for a turn.', stars: 0, status: 'locked' },
  { n: 18, name: 'High Roller', twist: 'Only sixes score. Everything else is a pass.', stars: 0, status: 'locked' },
  { n: 19, name: 'The Wall', twist: 'The rival defends a perfect board.', stars: 0, status: 'locked' },
  { n: 20, name: 'Final Rival', twist: 'Everything you have learned. One last duel.', stars: 0, status: 'locked' },
];

const TOTAL_STARS = DUELS.reduce((s, d) => s + d.stars, 0); // 10
const CLEARED = DUELS.filter(d => d.status === 'cleared').length; // 4
const BANKED_ROLLS = Math.floor(TOTAL_STARS / 6); // 1
const CYCLE = TOTAL_STARS % 6; // 4
const TO_NEXT = 6 - CYCLE; // 2

// ── star-bank meter (6 segments to next dice roll) ──────────
function BankMeter({ filled = CYCLE, size = 18, gap = 7 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Star key={i} size={size} empty={i >= filled} glow={i < filled} />
      ))}
    </div>
  );
}

// small row of up-to-3 earned stars for a duel card
function DuelStars({ earned = 0, size = 18, gap = 6 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Star key={i} size={size} empty={i >= earned} fill={COSMIC.gold} />
      ))}
    </div>
  );
}

Object.assign(window, {
  COSMIC, Star, Dice, Lock, Check, Chevron, Bolt,
  DUELS, TOTAL_STARS, CLEARED, BANKED_ROLLS, CYCLE, TO_NEXT,
  BankMeter, DuelStars,
});
