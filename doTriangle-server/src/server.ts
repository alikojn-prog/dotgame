import type * as Party from "partykit/server";

// ---------- types ----------
type Phase = "lobby" | "rolloff" | "turn" | "drawing" | "end";
type Dot = { x: number; y: number };
type Triangle = { a: number; b: number; c: number; player: number };
type Player = {
  name: string;
  logo: string;
  connected: boolean;
  connId: string | null;
  token: string | null; // session token so a dropped player can reclaim their seat
};

type State = {
  phase: Phase;
  players: [Player, Player];
  numDots: number;
  dots: Dot[];
  edges: Record<string, number>;
  triangles: Triangle[];
  scoredTri: Record<string, boolean>;
  scores: [number, number];
  moves: [number, number];
  history: [number[], number[]];
  current: number;
  roMatrix: [number | null, number | null];
  roWho: number;
  linesLeft: number;
  // best-of-N match
  bestOf: number;
  matchWins: [number, number];
  matchOver: boolean;
  // epoch-ms deadline for the current phase (clients render the countdown)
  deadline: number | null;
};

type ServerEvent =
  | { type: "opponent_joined"; idx: number }
  | { type: "opponent_left"; idx: number }
  | { type: "opponent_rejoined"; idx: number }
  | { type: "dice_rolled"; playerIdx: number; value: number; for: "rolloff" | "turn" }
  | { type: "line_drawn"; a: number; b: number; byPlayer: number; triangles: Triangle[] }
  | { type: "turn_changed"; current: number }
  | { type: "turn_timeout"; idx: number }
  | { type: "rolloff_starter"; winnerIdx: number }
  | { type: "game_over"; winnerIdx: number | null }
  | { type: "rematch_requested"; idx: number }
  | { type: "rematch_start" };

// ---------- timing ----------
const ROLL_TIMEOUT_MS = 30_000;    // time to tap the dice before we auto-roll
const DRAW_TIMEOUT_MS = 22_000;    // time to draw lines before the turn passes
const ROLLOFF_TIMEOUT_MS = 12_000; // time to roll in the roll-off
const GRACE_MS = 30_000;           // reconnect window after a disconnect

// ---------- geometry (mirrors client rules so validation matches exactly) ----------
const VB = { w: 800, h: 800, margin: 80 };

function genDots(n: number): Dot[] {
  const uW = VB.w - 2 * VB.margin;
  const uH = VB.h - 2 * VB.margin;
  const minDist = Math.max(34, Math.sqrt((uW * uH) / n) * 0.62);
  const md2 = minDist * minDist;
  const dots: Dot[] = [];
  const max = n * 800;
  for (let t = 0; t < max && dots.length < n; t++) {
    const x = VB.margin + Math.random() * uW;
    const y = VB.margin + Math.random() * uH;
    let ok = true;
    for (const d of dots) {
      const dx = d.x - x, dy = d.y - y;
      if (dx * dx + dy * dy < md2) { ok = false; break; }
    }
    if (ok) dots.push({ x, y });
  }
  while (dots.length < n) dots.push({ x: VB.margin + Math.random() * uW, y: VB.margin + Math.random() * uH });
  return dots;
}

function edgeKey(i: number, j: number): string {
  return i < j ? `${i}-${j}` : `${j}-${i}`;
}

function orient(p: Dot, q: Dot, r: Dot): number {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

function onSeg(p: Dot, q: Dot, r: Dot): boolean {
  return Math.min(p.x, r.x) - 0.001 <= q.x && q.x <= Math.max(p.x, r.x) + 0.001 &&
         Math.min(p.y, r.y) - 0.001 <= q.y && q.y <= Math.max(p.y, r.y) + 0.001;
}

function segCross(p1: Dot, p2: Dot, p3: Dot, p4: Dot): boolean {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const e = 1e-6;
  if (Math.abs(d1) < e && onSeg(p3, p1, p4)) return true;
  if (Math.abs(d2) < e && onSeg(p3, p2, p4)) return true;
  if (Math.abs(d3) < e && onSeg(p1, p3, p2)) return true;
  if (Math.abs(d4) < e && onSeg(p1, p4, p2)) return true;
  return false;
}

function crossesExisting(state: State, a: number, b: number): boolean {
  const p1 = state.dots[a], p2 = state.dots[b];
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const dotR = 9;
  for (let c = 0; c < state.dots.length; c++) {
    if (c === a || c === b) continue;
    const pc = state.dots[c];
    if (Math.abs(orient(p1, p2, pc)) / len < dotR && onSeg(p1, pc, p2)) return true;
  }
  for (const key of Object.keys(state.edges)) {
    const [i, j] = key.split("-").map(Number);
    if (i === a || i === b || j === a || j === b) continue;
    if (segCross(p1, p2, state.dots[i], state.dots[j])) return true;
  }
  return false;
}

function hasEdge(state: State, i: number, j: number): boolean {
  return state.edges[edgeKey(i, j)] !== undefined;
}

function checkTriangles(state: State, a: number, b: number, player: number): Triangle[] {
  const made: Triangle[] = [];
  for (let c = 0; c < state.dots.length; c++) {
    if (c === a || c === b) continue;
    if (hasEdge(state, a, c) && hasEdge(state, b, c)) {
      const key = [a, b, c].sort((x, y) => x - y).join(",");
      if (!state.scoredTri[key]) {
        state.scoredTri[key] = true;
        const t: Triangle = { a, b, c, player };
        state.triangles.push(t);
        state.scores[player]++;
        made.push(t);
      }
    }
  }
  return made;
}

// The round ends when no legal line remains — every triangle gets fought over.
function hasAnyLegalMove(state: State): boolean {
  for (let i = 0; i < state.dots.length; i++) {
    for (let j = i + 1; j < state.dots.length; j++) {
      if (hasEdge(state, i, j)) continue;
      if (crossesExisting(state, i, j)) continue;
      return true;
    }
  }
  return false;
}

function emptyState(): State {
  return {
    phase: "lobby",
    players: [
      { name: "", logo: "", connected: false, connId: null, token: null },
      { name: "", logo: "", connected: false, connId: null, token: null },
    ],
    numDots: 10,
    dots: [],
    edges: {},
    triangles: [],
    scoredTri: {},
    scores: [0, 0],
    moves: [0, 0],
    history: [[], []],
    current: 0,
    roMatrix: [null, null],
    roWho: 0,
    linesLeft: 0,
    bestOf: 1,
    matchWins: [0, 0],
    matchOver: false,
    deadline: null,
  };
}

// ---------- server (each Party = one game room) ----------
export default class Server implements Party.Server {
  state: State = emptyState();
  hostInitialized = false;
  rematchVotes: Set<number> = new Set();
  phaseTimer: ReturnType<typeof setTimeout> | null = null;
  graceTimers: [ReturnType<typeof setTimeout> | null, ReturnType<typeof setTimeout> | null] = [null, null];

  constructor(readonly room: Party.Room) {}

  onConnect(_conn: Party.Connection) {
    // Wait for hello message; the client tells us whether it's the host or guest.
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === "hello") return this.onHello(m, sender);
    if (m.type === "roll") return this.onRoll(sender);
    if (m.type === "draw_line") return this.onDrawLine(m.a | 0, m.b | 0, sender);
    if (m.type === "end_turn") return this.onEndTurn(sender);
    if (m.type === "rematch") return this.onRematch(sender);
  }

  onClose(conn: Party.Connection) {
    for (let i = 0; i < 2; i++) {
      if (this.state.players[i].connId === conn.id) {
        this.state.players[i].connected = false;
        this.state.players[i].connId = null;
        const events: ServerEvent[] = [{ type: "opponent_left", idx: i }];
        if (this.state.phase !== "lobby" && this.state.phase !== "end") {
          // Pause the clock and give them a grace window to reconnect
          // instead of instantly forfeiting on a network blip.
          this.clearPhaseTimer();
          this.clearGrace(i);
          this.graceTimers[i] = setTimeout(() => {
            this.graceTimers[i] = null;
            if (this.state.players[i].connected) return;
            if (this.state.phase === "lobby" || this.state.phase === "end") return;
            this.endGame([], (1 - i) as 0 | 1); // forfeit — they never came back
          }, GRACE_MS);
        }
        this.broadcastUpdate(events);
        break;
      }
    }
  }

  // ---------- helpers ----------
  private senderIdx(sender: Party.Connection): number {
    for (let i = 0; i < 2; i++) if (this.state.players[i].connId === sender.id) return i;
    return -1;
  }
  private send(conn: Party.Connection, obj: any) { conn.send(JSON.stringify(obj)); }
  private broadcastUpdate(events: ServerEvent[]) {
    // Never broadcast session tokens or connection ids.
    const s = this.state;
    const publicState = {
      ...s,
      players: s.players.map((p) => ({ name: p.name, logo: p.logo, connected: p.connected })),
    };
    this.room.broadcast(JSON.stringify({ type: "update", state: publicState, events }));
  }

  private clearPhaseTimer() {
    if (this.phaseTimer) { clearTimeout(this.phaseTimer); this.phaseTimer = null; }
    this.state.deadline = null;
  }
  private setPhaseDeadline(ms: number, fn: () => void) {
    this.clearPhaseTimer();
    this.state.deadline = Date.now() + ms;
    this.phaseTimer = setTimeout(fn, ms);
  }
  private clearGrace(idx: number) {
    if (this.graceTimers[idx]) { clearTimeout(this.graceTimers[idx]!); this.graceTimers[idx] = null; }
  }
  // Re-arm the right timer for the current phase (used after reconnects).
  private rearmPhase() {
    if (this.state.phase === "turn") {
      this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    } else if (this.state.phase === "drawing") {
      this.setPhaseDeadline(DRAW_TIMEOUT_MS, () => this.timeoutTurn());
    } else if (this.state.phase === "rolloff") {
      this.armRolloffTimeout();
    } else {
      this.clearPhaseTimer();
    }
  }

  // ---------- message handlers ----------
  private onHello(m: any, sender: Party.Connection) {
    if (m.intent === "create") {
      if (this.hostInitialized) {
        this.send(sender, { type: "error", message: "Room already started" });
        return;
      }
      this.state = emptyState();
      this.state.numDots = Math.max(4, Math.min(60, (m.numDots | 0) || 10));
      this.state.bestOf = (m.bestOf | 0) === 3 ? 3 : 1;
      this.state.dots = genDots(this.state.numDots);
      this.state.players[0] = {
        name: String(m.name || "Player 1").slice(0, 14),
        logo: String(m.logo || "⭐️").slice(0, 8),
        connected: true,
        connId: sender.id,
        token: m.token ? String(m.token).slice(0, 64) : null,
      };
      this.hostInitialized = true;
      this.send(sender, { type: "you", playerIdx: 0, code: this.room.id });
      this.broadcastUpdate([]);
      return;
    }
    if (m.intent === "join") {
      if (!this.hostInitialized) {
        this.send(sender, { type: "error", message: "Room not found" });
        return;
      }
      if (this.state.players[1].connected) {
        this.send(sender, { type: "error", message: "Room is full" });
        return;
      }
      let logo = String(m.logo || "🔥").slice(0, 8);
      if (logo === this.state.players[0].logo) {
        logo = logo === "🔥" ? "⚡️" : "🔥";
      }
      this.state.players[1] = {
        name: String(m.name || "Player 2").slice(0, 14),
        logo,
        connected: true,
        connId: sender.id,
        token: m.token ? String(m.token).slice(0, 64) : null,
      };
      this.send(sender, { type: "you", playerIdx: 1, code: this.room.id });
      this.state.phase = "rolloff";
      this.state.roMatrix = [null, null];
      this.state.roWho = 0;
      this.armRolloffTimeout();
      this.broadcastUpdate([{ type: "opponent_joined", idx: 1 }]);
      return;
    }
    if (m.intent === "resume") {
      const tok = m.token ? String(m.token).slice(0, 64) : "";
      let idx = -1;
      for (let i = 0; i < 2; i++) {
        if (tok && this.state.players[i].token && this.state.players[i].token === tok) idx = i;
      }
      if (idx === -1) {
        this.send(sender, { type: "error", message: "Nothing to resume" });
        return;
      }
      this.state.players[idx].connected = true;
      this.state.players[idx].connId = sender.id;
      this.clearGrace(idx);
      this.send(sender, { type: "you", playerIdx: idx, code: this.room.id });
      if (this.state.phase !== "lobby" && this.state.phase !== "end") this.rearmPhase();
      this.broadcastUpdate([{ type: "opponent_rejoined", idx }]);
      return;
    }
  }

  private onRoll(sender: Party.Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.state.phase === "rolloff") {
      if (idx !== this.state.roWho) return;
      if (this.state.roMatrix[idx] != null) return;
      this.doRolloffRoll(idx);
      return;
    }
    if (this.state.phase === "turn") {
      if (idx !== this.state.current) return;
      this.doTurnRoll(idx);
      return;
    }
  }

  private doRolloffRoll(idx: number) {
    const n = 1 + Math.floor(Math.random() * 6);
    this.state.roMatrix[idx] = n;
    this.clearPhaseTimer();
    this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "rolloff" }]);
    setTimeout(() => this.rolloffAdvance(), 1300);
  }

  private doTurnRoll(idx: number) {
    const n = 1 + Math.floor(Math.random() * 6);
    this.state.linesLeft = n;
    this.state.history[idx].push(n);
    this.state.phase = "drawing";
    this.setPhaseDeadline(DRAW_TIMEOUT_MS, () => this.timeoutTurn());
    this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "turn" }]);
  }

  private armRolloffTimeout() {
    this.setPhaseDeadline(ROLLOFF_TIMEOUT_MS, () => {
      if (this.state.phase !== "rolloff") return;
      const w = this.state.roWho;
      if (this.state.roMatrix[w] == null) this.doRolloffRoll(w);
    });
  }

  // The active player never rolled — roll for them so the game can't stall.
  private autoRoll() {
    if (this.state.phase !== "turn") return;
    if (!this.state.players[this.state.current].connected) return; // grace timer will resolve this
    this.doTurnRoll(this.state.current);
  }

  // The active player ran out of drawing time — pass the turn.
  private timeoutTurn() {
    if (this.state.phase !== "drawing") return;
    if (!this.state.players[this.state.current].connected) return; // grace timer will resolve this
    this.advanceTurn([{ type: "turn_timeout", idx: this.state.current }]);
  }

  private rolloffAdvance() {
    if (this.state.phase !== "rolloff") return;
    if (this.state.roWho === 0) {
      this.state.roWho = 1;
      this.armRolloffTimeout();
      this.broadcastUpdate([]);
      return;
    }
    const a = this.state.roMatrix[0]!, b = this.state.roMatrix[1]!;
    if (a === b) {
      this.state.roMatrix = [null, null];
      this.state.roWho = 0;
      this.armRolloffTimeout();
      this.broadcastUpdate([]);
      return;
    }
    this.state.current = a > b ? 0 : 1;
    this.state.phase = "turn";
    this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    this.broadcastUpdate([{ type: "rolloff_starter", winnerIdx: this.state.current }]);
  }

  private onDrawLine(a: number, b: number, sender: Party.Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.state.phase !== "drawing") return;
    if (idx !== this.state.current) return;
    if (a === b) return;
    const n = this.state.dots.length;
    if (a < 0 || a >= n || b < 0 || b >= n) return;
    if (hasEdge(this.state, a, b)) return;
    if (crossesExisting(this.state, a, b)) return;
    this.state.edges[edgeKey(a, b)] = idx;
    this.state.moves[idx]++;
    const newTri = checkTriangles(this.state, a, b, idx);
    this.state.linesLeft--;
    const events: ServerEvent[] = [{ type: "line_drawn", a, b, byPlayer: idx, triangles: newTri }];
    if (!hasAnyLegalMove(this.state)) { this.endGame(events); return; }
    if (this.state.linesLeft <= 0) { this.advanceTurn(events); return; }
    this.broadcastUpdate(events);
  }

  private onEndTurn(sender: Party.Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.state.phase !== "drawing" || idx !== this.state.current) return;
    this.advanceTurn([]);
  }

  private advanceTurn(events: ServerEvent[]) {
    if (!hasAnyLegalMove(this.state)) { this.endGame(events); return; }
    this.state.current = 1 - this.state.current;
    this.state.phase = "turn";
    this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    events.push({ type: "turn_changed", current: this.state.current });
    this.broadcastUpdate(events);
  }

  private endGame(events: ServerEvent[], forcedWinner?: 0 | 1) {
    this.clearPhaseTimer();
    this.state.phase = "end";
    this.rematchVotes.clear();
    const [a, b] = this.state.scores;
    const winner: number | null =
      forcedWinner !== undefined ? forcedWinner : (a === b ? null : (a > b ? 0 : 1));
    if (forcedWinner !== undefined) {
      // disconnect forfeit ends the whole match
      this.state.matchOver = true;
    } else if (this.state.bestOf > 1) {
      if (winner != null) this.state.matchWins[winner]++;
      const need = Math.floor(this.state.bestOf / 2) + 1;
      this.state.matchOver = this.state.matchWins[0] >= need || this.state.matchWins[1] >= need;
    } else {
      this.state.matchOver = true;
    }
    events.push({ type: "game_over", winnerIdx: winner });
    this.broadcastUpdate(events);
  }

  private onRematch(sender: Party.Connection) {
    if (this.state.phase !== "end") return;
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    this.rematchVotes.add(idx);
    if (this.rematchVotes.size < 2) {
      // Tell both players one person wants to keep playing
      this.broadcastUpdate([{ type: "rematch_requested", idx }]);
      return;
    }
    // Both agreed — reset board, keep players (and the match score if the
    // match is still running; start fresh if it's decided).
    this.rematchVotes.clear();
    const players = this.state.players;
    const numDots = this.state.numDots;
    const bestOf = this.state.bestOf;
    const matchWins: [number, number] = this.state.matchOver ? [0, 0] : this.state.matchWins;
    this.state = emptyState();
    this.state.players = players;
    this.state.numDots = numDots;
    this.state.bestOf = bestOf;
    this.state.matchWins = matchWins;
    this.state.dots = genDots(numDots);
    this.state.phase = "rolloff";
    this.state.roMatrix = [null, null];
    this.state.roWho = 0;
    this.armRolloffTimeout();
    this.broadcastUpdate([{ type: "rematch_start" }]);
  }
}
