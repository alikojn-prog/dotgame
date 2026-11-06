// doTriangle multiplayer server — PartyServer (runs on your own Cloudflare account).
// Migrated from hosted PartyKit, which shut down on 23 Oct 2026.
import { Server, routePartykitRequest, type Connection, type WSMessage } from "partyserver";

type Env = { Main: DurableObjectNamespace<Main> };

// ---------- types ----------
type Phase = "lobby" | "rolloff" | "turn" | "drawing" | "end";
type Dot = { x: number; y: number };
type Triangle = { a: number; b: number; c: number; player: number; pts: number };
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
  goldenDot: number; // index of the x2 dot, -1 = none
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
  // Stalemate guard: did the current player draw at least one line this turn,
  // and how many turns in a row have ended with no line drawn. Two consecutive
  // no-draw turns (both players pass) ends the game even if legal lines remain.
  drewThisTurn: boolean;
  passStreak: number;
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
  | { type: "game_over"; winnerIdx: number | null; reason?: "stalemate" }
  | { type: "rematch_requested"; idx: number }
  | { type: "rematch_start" };

// ---------- quick match ----------
// One well-known room acts as the matchmaking lobby: players send "find",
// and the first two waiting get paired into a fresh game room.
const QM_LOBBY_ID = "qmlobby";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genMatchCode(): string {
  let s = "QM";
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

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

// Golden (x2) dot disabled — always -1.
function pickGoldenDot(_n: number): number {
  return -1;
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

// Minimum-angle rule: thin "sliver" triangles never count (must match the
// client's MIN_TRI_ANGLE_DEG in index.html, or online play will desync).
const MIN_TRI_ANGLE = 0 * Math.PI / 180;  // 0 = no sliver limit; every triangle counts
function triAngleOK(state: State, a: number, b: number, c: number): boolean {
  const A = state.dots[a], B = state.dots[b], C = state.dots[c];
  const ang = (P: Dot, Q: Dot, R: Dot): number => {
    const x1 = Q.x - P.x, y1 = Q.y - P.y, x2 = R.x - P.x, y2 = R.y - P.y;
    const m1 = Math.hypot(x1, y1), m2 = Math.hypot(x2, y2);
    if (m1 < 1e-9 || m2 < 1e-9) return 0;
    const cs = Math.max(-1, Math.min(1, (x1 * x2 + y1 * y2) / (m1 * m2)));
    return Math.acos(cs);
  };
  return Math.min(ang(A, B, C), ang(B, A, C), ang(C, A, B)) >= MIN_TRI_ANGLE;
}

function checkTriangles(state: State, a: number, b: number, player: number): Triangle[] {
  const made: Triangle[] = [];
  for (let c = 0; c < state.dots.length; c++) {
    if (c === a || c === b) continue;
    if (hasEdge(state, a, c) && hasEdge(state, b, c)) {
      if (!triAngleOK(state, a, b, c)) continue; // sliver triangles don't count
      const key = [a, b, c].sort((x, y) => x - y).join(",");
      if (!state.scoredTri[key]) {
        state.scoredTri[key] = true;
        const g = state.goldenDot;
        const pts = (a === g || b === g || c === g) ? 2 : 1;
        const t: Triangle = { a, b, c, player, pts };
        state.triangles.push(t);
        state.scores[player] += pts;
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
    goldenDot: -1,
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
    drewThisTurn: false,
    passStreak: 0,
    bestOf: 1,
    matchWins: [0, 0],
    matchOver: false,
    deadline: null,
  };
}

// ---------- server (each Durable Object = one game room) ----------
// The binding is named "Main", so rooms live at /parties/main/<code> — the same
// path the old PartyKit server used, so the client URL format is unchanged.
export class Main extends Server<Env> {
  game: State = emptyState();
  hostInitialized = false;
  rematchVotes: Set<number> = new Set();
  qmQueue: { connId: string; name: string }[] = []; // only used by the lobby room
  phaseTimer: ReturnType<typeof setTimeout> | null = null;
  graceTimers: [ReturnType<typeof setTimeout> | null, ReturnType<typeof setTimeout> | null] = [null, null];

  onConnect(_conn: Connection) {
    // Wait for hello message; the client tells us whether it's the host or guest.
  }

  async onMessage(sender: Connection, raw: WSMessage) {
    if (typeof raw !== "string") return;
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (this.name === QM_LOBBY_ID) return this.onLobbyMessage(m, sender);
    if (m.type === "hello") return this.onHello(m, sender);
    if (m.type === "roll") return this.onRoll(sender);
    if (m.type === "draw_line") return this.onDrawLine(m.a | 0, m.b | 0, sender);
    if (m.type === "end_turn") return this.onEndTurn(sender);
    if (m.type === "rematch") return this.onRematch(sender);
  }

  // Pair waiting players; whoever was queued first hosts the game room.
  private onLobbyMessage(m: any, sender: Connection) {
    if (m.type !== "find") return;
    const name = String(m.name || "Player").slice(0, 14);
    // prune our own duplicates and anyone who has since disconnected
    this.qmQueue = this.qmQueue.filter(
      (q) => q.connId !== sender.id && this.getConnection(q.connId) !== undefined
    );
    const partner = this.qmQueue.shift();
    if (partner) {
      const pc = this.getConnection(partner.connId);
      if (pc) {
        const code = genMatchCode();
        this.send(pc, { type: "matched", code, role: "create", opponent: name });
        this.send(sender, { type: "matched", code, role: "join", opponent: partner.name });
        return;
      }
    }
    this.qmQueue.push({ connId: sender.id, name });
    this.send(sender, { type: "queued" });
  }

  onClose(conn: Connection) {
    if (this.name === QM_LOBBY_ID) {
      this.qmQueue = this.qmQueue.filter((q) => q.connId !== conn.id);
      return;
    }
    for (let i = 0; i < 2; i++) {
      if (this.game.players[i].connId === conn.id) {
        this.game.players[i].connected = false;
        this.game.players[i].connId = null;
        const events: ServerEvent[] = [{ type: "opponent_left", idx: i }];
        if (this.game.phase !== "lobby" && this.game.phase !== "end") {
          // Pause the clock and give them a grace window to reconnect
          // instead of instantly forfeiting on a network blip.
          this.clearPhaseTimer();
          this.clearGrace(i);
          this.graceTimers[i] = setTimeout(() => {
            this.graceTimers[i] = null;
            if (this.game.players[i].connected) return;
            if (this.game.phase === "lobby" || this.game.phase === "end") return;
            this.endGame([], (1 - i) as 0 | 1); // forfeit — they never came back
          }, GRACE_MS);
        }
        this.broadcastUpdate(events);
        break;
      }
    }
  }

  // ---------- helpers ----------
  private senderIdx(sender: Connection): number {
    for (let i = 0; i < 2; i++) if (this.game.players[i].connId === sender.id) return i;
    return -1;
  }
  private send(conn: Connection, obj: any) { conn.send(JSON.stringify(obj)); }
  private broadcastUpdate(events: ServerEvent[]) {
    // Never broadcast session tokens or connection ids.
    const s = this.game;
    const publicState = {
      ...s,
      players: s.players.map((p) => ({ name: p.name, logo: p.logo, connected: p.connected })),
    };
    this.broadcast(JSON.stringify({ type: "update", state: publicState, events }));
  }

  private clearPhaseTimer() {
    if (this.phaseTimer) { clearTimeout(this.phaseTimer); this.phaseTimer = null; }
    this.game.deadline = null;
  }
  private setPhaseDeadline(ms: number, fn: () => void) {
    this.clearPhaseTimer();
    this.game.deadline = Date.now() + ms;
    this.phaseTimer = setTimeout(fn, ms);
  }
  private clearGrace(idx: number) {
    if (this.graceTimers[idx]) { clearTimeout(this.graceTimers[idx]!); this.graceTimers[idx] = null; }
  }
  // Re-arm the right timer for the current phase (used after reconnects).
  private rearmPhase() {
    if (this.game.phase === "turn") {
      this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    } else if (this.game.phase === "drawing") {
      this.setPhaseDeadline(DRAW_TIMEOUT_MS, () => this.timeoutTurn());
    } else if (this.game.phase === "rolloff") {
      this.armRolloffTimeout();
    } else {
      this.clearPhaseTimer();
    }
  }

  // ---------- message handlers ----------
  private onHello(m: any, sender: Connection) {
    if (m.intent === "create") {
      if (this.hostInitialized) {
        this.send(sender, { type: "error", message: "Room already started" });
        return;
      }
      this.game = emptyState();
      this.game.numDots = Math.max(4, Math.min(60, (m.numDots | 0) || 10));
      this.game.bestOf = (m.bestOf | 0) === 3 ? 3 : 1;
      this.game.dots = genDots(this.game.numDots);
      this.game.goldenDot = pickGoldenDot(this.game.dots.length);
      this.game.players[0] = {
        name: String(m.name || "Player 1").slice(0, 14),
        logo: String(m.logo || "⭐️").slice(0, 8),
        connected: true,
        connId: sender.id,
        token: m.token ? String(m.token).slice(0, 64) : null,
      };
      this.hostInitialized = true;
      this.send(sender, { type: "you", playerIdx: 0, code: this.name });
      this.broadcastUpdate([]);
      return;
    }
    if (m.intent === "join") {
      if (!this.hostInitialized) {
        this.send(sender, { type: "error", message: "Room not found" });
        return;
      }
      if (this.game.players[1].connected) {
        this.send(sender, { type: "error", message: "Room is full" });
        return;
      }
      let logo = String(m.logo || "🔥").slice(0, 8);
      if (logo === this.game.players[0].logo) {
        logo = logo === "🔥" ? "⚡️" : "🔥";
      }
      this.game.players[1] = {
        name: String(m.name || "Player 2").slice(0, 14),
        logo,
        connected: true,
        connId: sender.id,
        token: m.token ? String(m.token).slice(0, 64) : null,
      };
      this.send(sender, { type: "you", playerIdx: 1, code: this.name });
      this.game.phase = "rolloff";
      this.game.roMatrix = [null, null];
      this.game.roWho = 0;
      this.armRolloffTimeout();
      this.broadcastUpdate([{ type: "opponent_joined", idx: 1 }]);
      return;
    }
    if (m.intent === "resume") {
      const tok = m.token ? String(m.token).slice(0, 64) : "";
      let idx = -1;
      for (let i = 0; i < 2; i++) {
        if (tok && this.game.players[i].token && this.game.players[i].token === tok) idx = i;
      }
      if (idx === -1) {
        this.send(sender, { type: "error", message: "Nothing to resume" });
        return;
      }
      this.game.players[idx].connected = true;
      this.game.players[idx].connId = sender.id;
      this.clearGrace(idx);
      this.send(sender, { type: "you", playerIdx: idx, code: this.name });
      if (this.game.phase !== "lobby" && this.game.phase !== "end") this.rearmPhase();
      this.broadcastUpdate([{ type: "opponent_rejoined", idx }]);
      return;
    }
  }

  private onRoll(sender: Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.game.phase === "rolloff") {
      if (idx !== this.game.roWho) return;
      if (this.game.roMatrix[idx] != null) return;
      this.doRolloffRoll(idx);
      return;
    }
    if (this.game.phase === "turn") {
      if (idx !== this.game.current) return;
      this.doTurnRoll(idx);
      return;
    }
  }

  private doRolloffRoll(idx: number) {
    const n = 1 + Math.floor(Math.random() * 6);
    this.game.roMatrix[idx] = n;
    this.clearPhaseTimer();
    this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "rolloff" }]);
    setTimeout(() => this.rolloffAdvance(), 1300);
  }

  private doTurnRoll(idx: number) {
    const n = 1 + Math.floor(Math.random() * 6);
    this.game.linesLeft = n;
    this.game.history[idx].push(n);
    this.game.drewThisTurn = false;   // reset for the stalemate guard
    this.game.phase = "drawing";
    this.setPhaseDeadline(DRAW_TIMEOUT_MS, () => this.timeoutTurn());
    this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "turn" }]);
  }

  private armRolloffTimeout() {
    this.setPhaseDeadline(ROLLOFF_TIMEOUT_MS, () => {
      if (this.game.phase !== "rolloff") return;
      const w = this.game.roWho;
      if (this.game.roMatrix[w] == null) this.doRolloffRoll(w);
    });
  }

  // The active player never rolled — roll for them so the game can't stall.
  private autoRoll() {
    if (this.game.phase !== "turn") return;
    if (!this.game.players[this.game.current].connected) return; // grace timer will resolve this
    this.doTurnRoll(this.game.current);
  }

  // The active player ran out of drawing time — pass the turn.
  private timeoutTurn() {
    if (this.game.phase !== "drawing") return;
    if (!this.game.players[this.game.current].connected) return; // grace timer will resolve this
    this.advanceTurn([{ type: "turn_timeout", idx: this.game.current }]);
  }

  private rolloffAdvance() {
    if (this.game.phase !== "rolloff") return;
    if (this.game.roWho === 0) {
      this.game.roWho = 1;
      this.armRolloffTimeout();
      this.broadcastUpdate([]);
      return;
    }
    const a = this.game.roMatrix[0]!, b = this.game.roMatrix[1]!;
    if (a === b) {
      this.game.roMatrix = [null, null];
      this.game.roWho = 0;
      this.armRolloffTimeout();
      this.broadcastUpdate([]);
      return;
    }
    this.game.current = a > b ? 0 : 1;
    this.game.phase = "turn";
    this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    this.broadcastUpdate([{ type: "rolloff_starter", winnerIdx: this.game.current }]);
  }

  private onDrawLine(a: number, b: number, sender: Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.game.phase !== "drawing") return;
    if (idx !== this.game.current) return;
    if (a === b) return;
    const n = this.game.dots.length;
    if (a < 0 || a >= n || b < 0 || b >= n) return;
    if (hasEdge(this.game, a, b)) return;
    if (crossesExisting(this.game, a, b)) return;
    this.game.edges[edgeKey(a, b)] = idx;
    this.game.moves[idx]++;
    this.game.drewThisTurn = true;    // a line was drawn → not a pass
    const newTri = checkTriangles(this.game, a, b, idx);
    this.game.linesLeft--;
    const events: ServerEvent[] = [{ type: "line_drawn", a, b, byPlayer: idx, triangles: newTri }];
    if (!hasAnyLegalMove(this.game)) { this.endGame(events); return; }
    if (this.game.linesLeft <= 0) { this.advanceTurn(events); return; }
    this.broadcastUpdate(events);
  }

  private onEndTurn(sender: Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.game.phase !== "drawing" || idx !== this.game.current) return;
    this.advanceTurn([]);
  }

  private advanceTurn(events: ServerEvent[]) {
    if (!hasAnyLegalMove(this.game)) { this.endGame(events); return; }
    // Stalemate guard: the turn that just ended either drew (reset the streak)
    // or passed (extend it). Two passes in a row — both players declined to draw
    // while legal lines remain — is a deadlock, so end with the current scores.
    this.game.passStreak = this.game.drewThisTurn ? 0 : this.game.passStreak + 1;
    if (this.game.passStreak >= 2) { this.endGame(events, undefined, "stalemate"); return; }
    this.game.current = 1 - this.game.current;
    this.game.phase = "turn";
    this.setPhaseDeadline(ROLL_TIMEOUT_MS, () => this.autoRoll());
    events.push({ type: "turn_changed", current: this.game.current });
    this.broadcastUpdate(events);
  }

  private endGame(events: ServerEvent[], forcedWinner?: 0 | 1, reason?: "stalemate") {
    this.clearPhaseTimer();
    this.game.phase = "end";
    this.rematchVotes.clear();
    const [a, b] = this.game.scores;
    const winner: number | null =
      forcedWinner !== undefined ? forcedWinner : (a === b ? null : (a > b ? 0 : 1));
    if (forcedWinner !== undefined) {
      // disconnect forfeit ends the whole match
      this.game.matchOver = true;
    } else if (this.game.bestOf > 1) {
      if (winner != null) this.game.matchWins[winner]++;
      const need = Math.floor(this.game.bestOf / 2) + 1;
      this.game.matchOver = this.game.matchWins[0] >= need || this.game.matchWins[1] >= need;
    } else {
      this.game.matchOver = true;
    }
    events.push({ type: "game_over", winnerIdx: winner, reason });
    this.broadcastUpdate(events);
  }

  private onRematch(sender: Connection) {
    if (this.game.phase !== "end") return;
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
    const players = this.game.players;
    const numDots = this.game.numDots;
    const bestOf = this.game.bestOf;
    const matchWins: [number, number] = this.game.matchOver ? [0, 0] : this.game.matchWins;
    this.game = emptyState();
    this.game.players = players;
    this.game.numDots = numDots;
    this.game.bestOf = bestOf;
    this.game.matchWins = matchWins;
    this.game.dots = genDots(numDots);
    this.game.goldenDot = pickGoldenDot(this.game.dots.length);
    this.game.phase = "rolloff";
    this.game.roMatrix = [null, null];
    this.game.roWho = 0;
    this.armRolloffTimeout();
    this.broadcastUpdate([{ type: "rematch_start" }]);
  }
}

// Worker entry: route /parties/main/<room> WebSocket upgrades to the room's Durable Object.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const res = await routePartykitRequest(request, env);
    if (res) return res;
    return new Response("doTriangle server OK", { status: 200 });
  },
} satisfies ExportedHandler<Env>;
