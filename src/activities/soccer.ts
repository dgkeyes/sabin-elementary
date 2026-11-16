import { sfx } from '../core/sound';
import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Npc } from '../characters/npc';
import { kickMultiplier } from '../content/upgrades';
import { clamp } from '../util/math';
import { ballMesh } from './props';

/** The soccer field behind the school. Goals are on the short ends (x = X0 and x = X1). */
export const FIELD = { x0: 8, x1: 46, z0: -60, z1: -36, goalZ0: -50.5, goalZ1: -45.5, cx: 27, cz: -48 };
const BALL_R = 0.11;
const _v = new THREE.Vector3();

/** A ball that rolls, bounces, and can be dribbled by walking into it. */
export class Ball {
  readonly mesh = ballMesh();
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  /** Who touched it last: 'player' or an NPC id. */
  lastTouch = '';
  /** Set when the ball crosses a goal line inside the goal: -1 left goal, +1 right goal. */
  onGoal: ((side: -1 | 1) => void) | null = null;
  /** Keep the ball inside the field lines (true for matches, false for drills that use the whole field). */
  bounded = true;
  /** Seconds after a kick during which people cannot stop the ball by walking into it. */
  private free = 0;
  /** True from a goal until the next reset, so a ball resting in the net scores once. */
  private scored = false;

  constructor(scene: THREE.Scene) {
    scene.add(this.mesh);
  }

  reset(x: number, z: number) {
    this.scored = false;
    this.pos.set(x, BALL_R, z);
    this.vel.set(0, 0, 0);
    this.sync();
  }

  kick(dir: THREE.Vector3, power: number, lift = 0) {
    sfx.kick();
    this.vel.set(dir.x * power, lift, dir.z * power);
    this.free = 0.25;
  }

  /** Pushes the ball ahead when a person runs into it, which is how dribbling works. */
  touch(p: THREE.Vector3, vel: THREE.Vector3, who: string) {
    _v.subVectors(this.pos, p).setY(0);
    const d = _v.length();
    if (d > 0.42 || this.pos.y > 0.6 || this.free > 0) return false;
    const speed = Math.hypot(vel.x, vel.z);
    if (d < 1e-4) _v.set(Math.sin(Math.random() * 6), 0, Math.cos(Math.random() * 6));
    else _v.divideScalar(d);
    // keep the ball just in front of the dribbler
    this.pos.x = p.x + _v.x * 0.43;
    this.pos.z = p.z + _v.z * 0.43;
    const push = Math.max(speed * 1.25, 1.2);
    // mostly in the direction they are running
    if (speed > 0.3) _v.lerp(new THREE.Vector3(vel.x / speed, 0, vel.z / speed), 0.7).normalize();
    if (this.vel.dot(_v) < push) {
      this.vel.x = _v.x * push;
      this.vel.z = _v.z * push;
    }
    this.lastTouch = who;
    return true;
  }

  update(dt: number) {
    this.free -= dt;
    const p = this.pos;
    const v = this.vel;
    v.y -= 14 * dt;
    p.addScaledVector(v, dt);
    if (p.y < BALL_R) {
      p.y = BALL_R;
      v.y = v.y < -1.5 ? -v.y * 0.45 : 0;
    }
    const friction = p.y > BALL_R + 0.02 ? 0.3 : 1.1;
    const f = Math.exp(-friction * dt);
    v.x *= f;
    v.z *= f;
    if (this.bounded) {
      const F = FIELD;
      const inGoalMouth = p.z > F.goalZ0 + 0.1 && p.z < F.goalZ1 - 0.1 && p.y < 1.9;
      if (p.x < F.x0 && inGoalMouth) this.goal(-1);
      else if (p.x > F.x1 && inGoalMouth) this.goal(1);
      else {
        // the field is fenced by invisible boards so play never stops for throw-ins
        if (p.x < F.x0 + BALL_R) ((p.x = F.x0 + BALL_R), (v.x = Math.abs(v.x) * 0.6));
        if (p.x > F.x1 - BALL_R) ((p.x = F.x1 - BALL_R), (v.x = -Math.abs(v.x) * 0.6));
        if (p.z < F.z0 + BALL_R) ((p.z = F.z0 + BALL_R), (v.z = Math.abs(v.z) * 0.6));
        if (p.z > F.z1 - BALL_R) ((p.z = F.z1 - BALL_R), (v.z = -Math.abs(v.z) * 0.6));
      }
    }
    this.sync(dt);
  }

  private goal(side: -1 | 1) {
    this.vel.multiplyScalar(0.1);
    this.pos.x = side < 0 ? Math.max(this.pos.x, FIELD.x0 - 1.2) : Math.min(this.pos.x, FIELD.x1 + 1.2);
    if (this.scored) return;
    this.scored = true;
    this.onGoal?.(side);
  }

  private sync(dt = 0) {
    this.mesh.position.copy(this.pos);
    const s = Math.hypot(this.vel.x, this.vel.z);
    if (s > 0.01 && dt) {
      _v.set(this.vel.z, 0, -this.vel.x).normalize();
      this.mesh.rotateOnWorldAxis(_v, (s * dt) / BALL_R);
    }
  }

  dispose() {
    this.mesh.removeFromParent();
  }
}

/** The player's kick: aims where you face, bending toward the goal you attack when it's roughly ahead. */
export function playerKick(g: Game, ball: Ball, attackX: number | null, power = 9) {
  const p = g.player;
  const d = ball.pos.distanceTo(p.pos.clone().setY(BALL_R));
  if (d > 1.7) return false;
  const dir = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
  if (attackX !== null) {
    const toGoal = new THREE.Vector3(attackX - ball.pos.x, 0, FIELD.cz + (Math.random() - 0.5) * 3 - ball.pos.z).normalize();
    if (dir.dot(toGoal) > 0.55) dir.lerp(toGoal, 0.75).normalize();
  }
  const mult = kickMultiplier(g.save.upgrades.kick ?? 0);
  ball.kick(dir, power * mult, 2.2);
  ball.lastTouch = 'player';
  p.char.kick();
  return true;
}

export interface TeamMate {
  npc: Npc;
  team: 0 | 1;
  /** Home position as a fraction of the half: 0 = by own goal, 1 = at midfield. */
  role: 'keeper' | 'defense' | 'attack';
  cooldown: number;
}

/**
 * A small-sided match: you plus AI teammates against AI opponents.
 * Team 0 (blue, yours) attacks the right goal (x1); team 1 (red) attacks the left.
 */
export class SoccerMatch {
  readonly ball: Ball;
  readonly score: [number, number] = [0, 0];
  readonly mates: TeamMate[] = [];
  private pause = 0;
  private kickCd = 0;
  onScore: ((team: 0 | 1) => void) | null = null;
  playerOnField = false;

  constructor(private g: Game, npcs: Npc[]) {
    this.ball = new Ball(g.scene);
    const roles: TeamMate['role'][] = ['keeper', 'attack', 'defense'];
    npcs.forEach((npc, i) => {
      const team = (i % 2 === 0 ? 1 : 0) as 0 | 1;
      const idx = Math.floor(i / 2);
      // blue has the player, so blue's AI starts with defense
      const role = team === 0 ? (['keeper', 'defense', 'attack'] as const)[idx % 3] : roles[idx % 3];
      npc.busy = true;
      this.mates.push({ npc, team, role, cooldown: 0 });
    });
    this.ball.onGoal = (side) => {
      const team: 0 | 1 = side > 0 ? 0 : 1;
      this.score[team]++;
      this.pause = 2.5;
      this.onScore?.(team);
    };
    this.kickoff(true);
  }

  attackX(team: 0 | 1) {
    return team === 0 ? FIELD.x1 : FIELD.x0;
  }

  kickoff(placeKids: boolean) {
    this.ball.reset(FIELD.cx, FIELD.cz);
    for (const m of this.mates) {
      const home = this.homeSpot(m, true);
      if (placeKids) m.npc.place(home, m.team === 0 ? Math.PI / 2 : -Math.PI / 2);
      m.npc.leaveSeat();
      m.npc.char.pose = null;
      m.npc.steer = new THREE.Vector3();
    }
  }

  private homeSpot(m: TeamMate, kickoff = false) {
    const own = m.team === 0 ? FIELD.x0 : FIELD.x1;
    const dirX = m.team === 0 ? 1 : -1;
    const ball = this.ball.pos;
    const sameTeam = this.mates.filter((o) => o.team === m.team && o.role === m.role);
    const lane = sameTeam.indexOf(m) % 2 === 0 ? -4 : 4;
    if (m.role === 'keeper') return new THREE.Vector3(own + dirX * 1.0, 0, clamp(ball.z, FIELD.goalZ0 + 0.4, FIELD.goalZ1 - 0.4));
    if (m.role === 'defense') {
      const x = kickoff ? own + dirX * 9 : clamp((own + ball.x) / 2, Math.min(own, own + dirX * 18), Math.max(own, own + dirX * 18));
      return new THREE.Vector3(x, 0, clamp(FIELD.cz + lane + (ball.z - FIELD.cz) * 0.4, FIELD.z0 + 1, FIELD.z1 - 1));
    }
    const x = kickoff ? FIELD.cx - dirX * 3 : clamp(ball.x + dirX * 4, FIELD.x0 + 2, FIELD.x1 - 2);
    return new THREE.Vector3(x, 0, clamp(FIELD.cz - lane + (ball.z - FIELD.cz) * 0.5, FIELD.z0 + 1, FIELD.z1 - 1));
  }

  /** Call when the player presses Kick. */
  playerKick() {
    if (this.kickCd > 0) return;
    this.kickCd = 0.35;
    if (!playerKick(this.g, this.ball, this.attackX(0))) this.g.player.char.kick();
  }

  playerNearBall() {
    return this.ball.pos.distanceTo(this.g.player.pos.clone().setY(BALL_R)) < 1.7;
  }

  update(dt: number) {
    const g = this.g;
    this.kickCd -= dt;
    if (this.pause > 0) {
      this.pause -= dt;
      for (const m of this.mates) m.npc.steer?.set(0, 0, 0);
      if (this.pause <= 0) this.kickoff(false);
      this.ball.update(dt);
      return;
    }
    // who chases the ball: the closest field player on each team
    const chaser: [TeamMate | null, TeamMate | null] = [null, null];
    for (const team of [0, 1] as const) {
      let best = Infinity;
      for (const m of this.mates) {
        if (m.team !== team || m.role === 'keeper') continue;
        const d = m.npc.pos.distanceTo(this.ball.pos);
        if (d < best) ((best = d), (chaser[team] = m));
      }
    }
    // if you are closer to the ball than your AI chaser, it gives you space
    const playerD = this.playerOnField ? g.player.pos.distanceTo(this.ball.pos) : Infinity;
    if (chaser[0] && playerD < chaser[0].npc.pos.distanceTo(this.ball.pos) - 0.5) chaser[0] = null;

    for (const m of this.mates) {
      const npc = m.npc;
      m.cooldown -= dt;
      const isChaser = chaser[m.team] === m;
      const keeperChase = m.role === 'keeper' && this.ball.pos.distanceTo(npc.pos) < 4 && Math.abs(this.ball.pos.x - (m.team === 0 ? FIELD.x0 : FIELD.x1)) < 6;
      let target: THREE.Vector3;
      let speed = 3.4;
      if (isChaser || keeperChase) {
        // run to a spot behind the ball, facing the goal we attack
        const goal = new THREE.Vector3(this.attackX(m.team), 0, FIELD.cz);
        const toGoal = goal.clone().sub(this.ball.pos).setY(0).normalize();
        target = this.ball.pos.clone().addScaledVector(toGoal, -0.35).setY(0);
        speed = 3.9;
        const d = npc.pos.distanceTo(this.ball.pos.clone().setY(0));
        if (d < 0.75 && m.cooldown <= 0 && this.ball.pos.y < 0.5) {
          const toTarget = new THREE.Vector3(this.attackX(m.team) - this.ball.pos.x, 0, FIELD.cz - this.ball.pos.z);
          const dist = toTarget.length();
          toTarget.normalize();
          toTarget.z += (Math.random() - 0.5) * 0.5;
          toTarget.normalize();
          // shoot when close, pass/dribble-kick otherwise
          const power = dist < 14 ? 10 + Math.random() * 3 : 5 + Math.random() * 2;
          this.ball.kick(toTarget, power, dist < 14 ? 1.5 : 0.6);
          this.ball.lastTouch = npc.id;
          npc.char.kick();
          m.cooldown = 0.9 + Math.random() * 0.6;
        }
      } else {
        target = this.homeSpot(m);
        speed = 2.6;
      }
      const to = target.sub(npc.pos).setY(0);
      const dist = to.length();
      const sp = dist < 0.3 ? 0 : Math.min(speed, dist * 2.5);
      npc.steer!.copy(to.normalize().multiplyScalar(sp));
      if (sp < 0.05 && dist < 0.3) npc.yaw = Math.atan2(this.ball.pos.x - npc.pos.x, this.ball.pos.z - npc.pos.z);
      // walking into the ball dribbles it
      if (this.ball.touch(npc.pos, npc.vel, npc.id)) m.cooldown = Math.max(m.cooldown, 0);
    }
    if (this.playerOnField) this.ball.touch(g.player.pos, g.player.vel, 'player');
    this.ball.update(dt);
  }

  dispose() {
    this.ball.dispose();
    for (const m of this.mates) {
      m.npc.steer = null;
      m.npc.busy = false;
      m.npc.vel.set(0, 0, 0);
    }
  }
}
