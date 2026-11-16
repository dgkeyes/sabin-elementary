import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Block } from '../content/schedule';
import { SUBJECTS, lessonFor, pickQuestions, type Subject, type SubjectId } from '../content/subjects';
import type { Npc } from '../characters/npc';
import type { Seat } from '../world/world';
import { inPlace } from '../world/places';
import type { Action } from '../ui/hud';
import { runQuiz } from '../ui/quiz';
import type { Activity } from './activity';
import { CLASS_GAMES, QUIZ_AFTER } from './classGames';
import { sfx } from '../core/sound';
import { LATE_GRACE_MINUTES } from '../config';
import { formatTime } from '../util/math';

/** Which desk in a classroom is yours: middle row, middle column (desks come in 3 rows). */
export const playerSeatIndex = (deskCount: number) => {
  const cols = deskCount / 3;
  return cols + Math.floor((cols - 1) / 2);
};

/**
 * A class period. The teacher waits at the board; when you take your seat (or your PE spot)
 * the teacher introduces the lesson in speech bubbles, then the class game for the subject runs:
 * multiple-choice questions, or the PE / art / music games in classGames.ts.
 */
export class ClassActivity implements Activity {
  readonly subject: Subject;
  private teacher: Npc;
  private state: 'waiting' | 'seated' | 'lesson' | 'done' = 'waiting';
  private removeIx: () => void;
  private seat: Seat | null;
  finished = false;
  private ended = false;

  constructor(private g: Game, readonly block: Block) {
    this.subject = SUBJECTS[block.subject as SubjectId];
    this.teacher = g.person(this.subject.teacherLook);
    this.teacher.busy = true;
    const spot = g.world.spot(`teacher:${block.place}`);
    this.teacher.placeAt(spot);
    const seats = g.world.seats.get(block.place);
    this.seat = seats ? seats[playerSeatIndex(seats.length)] : null;
    const at = this.seat ? this.seat.pos : g.world.spot('gym0').pos;
    this.removeIx = g.interactions.add({
      pos: at,
      radius: this.seat ? 2.2 : 3,
      label: this.seat ? 'Take your seat' : 'Join PE',
      enabled: () => this.state === 'waiting' && !this.ended,
      use: () => this.join(),
    });
  }

  private join() {
    const g = this.g;
    if (this.seat) {
      if (this.seat.taken && this.seat.taken !== g.player) (this.seat.taken as Npc).leaveSeat?.();
      g.sitPlayer(this.seat, 'sit');
    } else {
      const s = g.world.spot('gym0');
      g.player.teleport(s.pos, s.yaw);
    }
    const late = g.clock.minutes > this.block.start + LATE_GRACE_MINUTES;
    g.day.attendance.set(this.block.id, late ? 'late' : 'ontime');
    if (late) g.toast(`⏰ Late to ${this.block.title}`, 'bad');
    else g.toast(`🔔 On time for ${this.block.title}! Tap 👕 to change your outfit before the bell.`, 'good', 4);
    g.completeTask(this.block.task!);
    this.state = 'seated';
    g.outfitBreak = true;
    g.sceneLock++;
    g.persist();
  }

  update() {
    const g = this.g;
    if (this.state === 'seated' && g.clock.minutes >= this.block.start) {
      this.state = 'lesson';
      g.outfitBreak = false;
      // the clock waits for you during class; class lets out at its end time when you finish
      g.holdClock++;
      sfx.bell();
      void this.lesson();
    }
    // the teacher keeps an eye on the room
    if (this.state === 'waiting' && inPlace(g.zone, this.block.place) && !this.ended && !this.teacher.char.busy && !this.teacher.moving) {
      this.teacher.facePoint(g.player.pos);
    }
  }

  private async lesson() {
    const g = this.g;
    const t = this.teacher;
    const lesson = lessonFor(this.subject, g.save.day);
    if (this.seat) {
      const s = this.seat;
      const back = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      g.rig.look(s.pos.clone().addScaledVector(back, 1.0).setY(2.0), t.pos.clone().setY(1.2));
    }
    t.settle();
    t.ambient = false;
    t.char.pose = 'talk';
    t.facePoint(g.player.pos);
    await g.bubbles.say(t, t.name, `${this.subject.emoji} ${this.subject.name}: ${lesson.title}`, 30, true);
    for (const line of lesson.intro) await g.bubbles.say(t, t.name, line, 30, true);
    t.char.pose = null;
    t.ambient = true;
    const game = CLASS_GAMES[this.subject.mode];
    if (game) {
      await game(g, this.subject, t);
      const n = QUIZ_AFTER[this.subject.mode] ?? 0;
      if (n > 0 && !this.ended) {
        await g.bubbles.say(t, t.name, 'Now a couple of quick questions!', 30, true);
        await this.quiz(n);
      }
      if (!this.seat) g.standUp(); // PE: free to move again
    } else await this.quiz();
    t.char.playOnce('yes');
    const next = g.day.blocks.find((b) => b.start >= this.block.end);
    void g.bubbles.say(t, t.name, `Nice work today, ${g.name}! Class dismissed.${next ? ` ${next.title} is at ${formatTime(next.start)}.` : ''}`, 5);
    g.rig.mode = 'follow';
    g.sceneLock--;
    this.state = 'done';
    g.holdClock--;
    if (g.clock.minutes < this.block.end) g.clock.minutes = this.block.end;
    if (this.ended) this.leave();
  }

  private async quiz(n?: number) {
    const g = this.g;
    const qs = pickQuestions(this.subject, g.save.day, n);
    const res = await runQuiz(g.ui, `${this.subject.emoji} ${this.subject.name}`, qs, {
      removeWrong: g.save.upgrades.pencil ?? 0,
      onAnswer: (right) => this.teacher.char.playOnce(right ? 'yes' : 'no', 0.15, 1.4),
    });
    g.save.totals.correct += res.correct;
    g.save.totals.answered += res.total;
    g.persist();
    const msg = res.correct === res.total ? `Perfect, ${res.correct} out of ${res.total}! 🌟` : `You got ${res.correct} out of ${res.total}. Keep practicing!`;
    await g.bubbles.say(this.teacher, this.teacher.name, msg, 3);
  }

  private leave() {
    const g = this.g;
    if (g.player.seat && g.player.seat === this.seat) g.standUp();
    this.finished = true;
  }

  blockEnded() {
    this.ended = true;
    if (this.state !== 'lesson') {
      if (this.state === 'seated') this.g.sceneLock--;
      this.leave();
    }
  }

  actions(): Action[] {
    if (this.state === 'seated' && this.g.clock.minutes < this.block.start)
      return [
        { label: '👕 Change outfit', use: () => this.g.openWardrobe('wardrobe') },
        { label: 'Wait for bell ⏩', use: () => (this.g.clock.minutes = this.block.start) },
      ];
    return [];
  }

  dispose() {
    if (this.state === 'lesson') this.g.holdClock = Math.max(0, this.g.holdClock - 1);
    if (this.state === 'seated') this.g.outfitBreak = false;
    this.removeIx();
    this.teacher.char.pose = null;
  }
}

export type { Subject };
