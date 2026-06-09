import type * as Party from "partykit/server";

// ---------- types ----------
type Phase = "lobby" | "rolloff" | "turn" | "drawing" | "end";
type Dot = { x: number; y: number };
type Triangle = { a: number; b: number; c: number; player: number };
type Player = { name: string; logo: string; connected: boolean; connId: string | null };

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
};

type ServerEvent =
  | { type: "opponent_joined"; idx: number }
  | { type: "opponent_left"; idx: number }
  | { type: "dice_rolled"; playerIdx: number; value: number; for: "rolloff" | "turn" }
  | { type: "line_drawn"; a: number; b: number; byPlayer: number; triangles: Triangle[] }
  | { type: "turn_changed"; current: number }
  | { type: "rolloff_starter"; winnerIdx: number }
  | { type: "game_over"; winnerIdx: number | null }
  | { type: "rematch_requested"; idx: number }
  | { type: "rematch_start" };

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

function allConnected(state: State): boolean {
  const deg: Record<number, boolean> = {};
  for (const key of Object.keys(state.edges)) {
    const [i, j] = key.split("-").map(Number);
    deg[i] = true; deg[j] = true;
  }
  for (let i = 0; i < state.dots.length; i++) if (!deg[i]) return false;
  return true;
}

function emptyState(): State {
  return {
    phase: "lobby",
    players: [
      { name: "", logo: "", connected: false, connId: null },
      { name: "", logo: "", connected: false, connId: null },
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
  };
}

// ---------- server (each Party = one game room) ----------
export default class Server implements Party.Server {
  state: State = emptyState();
  hostInitialized = false;
  rematchVotes: Set<number> = new Set();

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
          this.state.phase = "end";
          events.push({ type: "game_over", winnerIdx: 1 - i });
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
    this.room.broadcast(JSON.stringify({ type: "update", state: this.state, events }));
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
      this.state.dots = genDots(this.state.numDots);
      this.state.players[0] = {
        name: String(m.name || "Player 1").slice(0, 14),
        logo: String(m.logo || "⭐️").slice(0, 8),
        connected: true,
        connId: sender.id,
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
      };
      this.send(sender, { type: "you", playerIdx: 1, code: this.room.id });
      this.state.phase = "rolloff";
      this.state.roMatrix = [null, null];
      this.state.roWho = 0;
      this.broadcastUpdate([{ type: "opponent_joined", idx: 1 }]);
      return;
    }
  }

  private onRoll(sender: Party.Connection) {
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    if (this.state.phase === "rolloff") {
      if (idx !== this.state.roWho) return;
      if (this.state.roMatrix[idx] != null) return;
      const n = 1 + Math.floor(Math.random() * 6);
      this.state.roMatrix[idx] = n;
      this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "rolloff" }]);
      setTimeout(() => this.rolloffAdvance(), 1300);
      return;
    }
    if (this.state.phase === "turn") {
      if (idx !== this.state.current) return;
      const n = 1 + Math.floor(Math.random() * 6);
      this.state.linesLeft = n;
      this.state.history[idx].push(n);
      this.state.phase = "drawing";
      this.broadcastUpdate([{ type: "dice_rolled", playerIdx: idx, value: n, for: "turn" }]);
      return;
    }
  }

  private rolloffAdvance() {
    if (this.state.phase !== "rolloff") return;
    if (this.state.roWho === 0) {
      this.state.roWho = 1;
      this.broadcastUpdate([]);
      return;
    }
    const a = this.state.roMatrix[0]!, b = this.state.roMatrix[1]!;
    if (a === b) {
      this.state.roMatrix = [null, null];
      this.state.roWho = 0;
      this.broadcastUpdate([]);
      return;
    }
    this.state.current = a > b ? 0 : 1;
    this.state.phase = "turn";
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
    if (allConnected(this.state)) { this.endGame(events); return; }
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
    if (allConnected(this.state)) { this.endGame(events); return; }
    this.state.current = 1 - this.state.current;
    this.state.phase = "turn";
    events.push({ type: "turn_changed", current: this.state.current });
    this.broadcastUpdate(events);
  }

  private endGame(events: ServerEvent[]) {
    this.state.phase = "end";
    this.rematchVotes.clear();
    const [a, b] = this.state.scores;
    events.push({ type: "game_over", winnerIdx: a === b ? null : (a > b ? 0 : 1) });
    this.broadcastUpdate(events);
  }

  private onRematch(sender: Party.Connection) {
    if (this.state.phase !== "end") return;
    const idx = this.senderIdx(sender);
    if (idx === -1) return;
    this.rematchVotes.add(idx);
    if (this.rematchVotes.size < 2) {
      // Tell both players one person wants a rematch
      this.broadcastUpdate([{ type: "rematch_requested", idx }]);
      return;
    }
    // Both want rematch — reset board, keep players, start new rolloff
    this.rematchVotes.clear();
    const players = this.state.players;
    const numDots = this.state.numDots;
    this.state = emptyState();
    this.state.players = players;
    this.state.numDots = numDots;
    this.state.dots = genDots(numDots);
    this.state.phase = "rolloff";
    this.state.roMatrix = [null, null];
    this.state.roWho = 0;
    this.broadcastUpdate([{ type: "rematch_start" }]);
  }
}
