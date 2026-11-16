import * as THREE from 'three';
import { GAME_MINUTES_PER_REAL_SECOND } from '../config';
import type { Game } from '../core/game';
import type { Block } from '../content/schedule';
import { h } from '../util/dom';
import type { Action } from '../ui/hud';
import type { Activity } from './activity';
import { FIELD, SoccerMatch } from './soccer';
import { MonkeyBars } from './monkeyBars';
import { RECESS_GAMES, type RecessGame } from './recessGames';

/**
 * Recess: free roam outside. Soccer with AI kids runs on the field; the playground has
 * monkey bars, and more recess games plug in through RECESS_GAMES (see recessGames.ts).
 */
export class RecessActivity implements Activity {
  finished = false;
  private match: SoccerMatch;
  private board: HTMLElement;
  private scoreEl: HTMLElement;
  private bars: MonkeyBars;
  private extras: RecessGame[];
  private outsideMinutes = 0;

  constructor(private g: Game, readonly block: Block) {
    const kids = g.kids.filter((k) => !k.busy).slice(0, 5);
    for (const k of kids) if (k.pos.z > 300) k.place(new THREE.Vector3(FIELD.cx, 0, FIELD.cz), 0);
    this.match = new SoccerMatch(g, kids);
    this.match.onScore = (team) => {
      const you = this.match.ball.lastTouch === 'player' && team === 0;
      if (you) {
        g.save.totals.goals++;
        g.toast(`⚽ GOAL by ${g.name}!`, 'good', 3);
        g.completeTask('recess');
      } else g.toast(team === 0 ? '⚽ Blue scores!' : '⚽ Red scores!', team === 0 ? 'good' : 'bad');
      this.renderScore();
    };
    this.scoreEl = h('span');
    this.board = h('div', { class: 'scoreboard' }, h('span', { class: 'blue' }, 'BLUE'), this.scoreEl, h('span', { class: 'red' }, 'RED'));
    this.board.style.display = 'none';
    g.ui.append(this.board);
    this.renderScore();
    this.bars = new MonkeyBars(g, () => g.completeTask('recess'));
    this.extras = RECESS_GAMES.map((make) => make(g, () => g.completeTask('recess')));
  }

  private renderScore() {
    this.scoreEl.textContent = `${this.match.score[0]} - ${this.match.score[1]}`;
  }

  private onField() {
    const p = this.g.player.pos;
    return p.x > FIELD.x0 - 2 && p.x < FIELD.x1 + 2 && p.z > FIELD.z0 - 2 && p.z < FIELD.z1 + 2;
  }

  update(dt: number) {
    const g = this.g;
    const live = g.clock.minutes >= this.block.start && g.clock.minutes < this.block.end;
    const onField = this.onField();
    this.match.playerOnField = onField && !g.player.locked;
    if (live) this.match.update(dt);
    this.board.style.display = onField && live ? '' : 'none';
    this.bars.update(dt);
    for (const e of this.extras) e.update(dt);
    // just being outside and playing counts after a few minutes
    const z = g.zone?.id;
    if (live && (z === 'field' || z === 'playground')) {
      this.outsideMinutes += dt * GAME_MINUTES_PER_REAL_SECOND;
      if (this.outsideMinutes > 5) g.completeTask('recess');
    }
    if (live && onField && this.match.ball.lastTouch === 'player') g.completeTask('recess');
  }

  blockEnded() {
    this.g.toast('🔔 Recess is over. Lunch time!', '', 3);
    this.bars.stop();
    this.finished = true;
  }

  actions(): Action[] {
    const out: Action[] = [];
    if (this.match.playerOnField && this.match.playerNearBall()) out.push({ label: '⚽ Kick', instant: true, use: () => this.match.playerKick() });
    out.push(...this.bars.actions());
    for (const e of this.extras) out.push(...e.actions());
    return out;
  }

  dispose() {
    this.match.dispose();
    this.board.remove();
    this.bars.dispose();
    for (const e of this.extras) e.dispose();
  }
}
