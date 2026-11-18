import * as THREE from 'three';
import { hangArtwork } from '../activities/art';
import { Starbucks } from '../activities/starbucks';
import { initSound, sfx } from './sound';
import { BEDTIME_LIMIT, CASH_ALL_TASKS_BONUS, CASH_PER_TASK, DAY_START, GAME_MINUTES_PER_REAL_SECOND, LATE_GRACE_MINUTES } from '../config';
import { SCHOOL_OUT } from '../content/schedule';
import { Character, appearanceOf } from '../characters/character';
import { Npc } from '../characters/npc';
import { Player } from '../characters/player';
import { jumpMultiplier, speedMultiplier } from '../content/upgrades';
import { ADULTS, classmates, defaultAvatar, defaultLook, pajamas, parents, type CastMember } from '../game/cast';
import { DayState } from '../game/day';
import { Director } from '../game/director';
import { Interactions, labelOf } from '../game/interactions';
import { Creator } from '../ui/creator';
import { Bubbles, Hud, type Action } from '../ui/hud';
import { openSchedule, openShop, showSleep } from '../ui/panels';
import { openWatch } from '../ui/watch';
import { formatTime } from '../util/math';
import { BEDROOM_DOOR, PLACE_NAMES, PLACE_TARGET, STAIR_BOTTOM, STAIR_TOP, UPSTAIRS, floorOf, inPlace, zoneAt, type PlaceId, type Zone } from '../world/places';
import { World } from '../world/world';
import { CameraRig } from './cameraRig';
import { Input } from './input';
import { writeSave, type SaveData } from './save';

const _move = new THREE.Vector3();
const _fwd = new THREE.Vector3();

export interface GuideInfo {
  title: string;
  sub: string;
  late: boolean;
  place: PlaceId | null;
}

/** Owns the renderer, the world, the people in it, and the clock. */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  readonly rig: CameraRig;
  readonly input: Input;
  readonly world: World;
  readonly player: Player;
  readonly hud: Hud;
  readonly bubbles: Bubbles;
  readonly interactions = new Interactions();
  readonly people = new Map<string, Npc>();
  readonly kids: Npc[] = [];
  readonly director: Director;
  readonly clock = { minutes: DAY_START, paused: true };
  day!: DayState;
  guideOn = true;
  dressed = false;
  zone: Zone | null = null;
  /** While above zero, the player cannot stand up or open menus (lessons, cut-scenes). */
  sceneLock = 0;
  /** While above 0 the clock stands still (you are in the middle of a class). */
  holdClock = 0;
  /** True while you sit in class before the bell: the wardrobe is allowed then. */
  outfitBreak = false;
  /** Game minute until which a Starbucks treat makes you faster. */
  boostUntil = 0;
  starbucks!: Starbucks;
  private modal = false;
  private guideArrow: THREE.Mesh;
  private beacon: THREE.Mesh;
  private guidePath: THREE.Vector3[] = [];
  private guideTimer = 0;
  private last = performance.now();
  private sleeping = false;
  private fade: HTMLElement;
  private fps = { frames: 0, t: 0, value: 60 };

  constructor(
    canvas: HTMLCanvasElement,
    readonly ui: HTMLElement,
    readonly save: SaveData,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color('#9fd0f5');
    this.scene.fog = new THREE.Fog('#9fd0f5', 70, 190);
    this.rig = new CameraRig(this.camera);
    this.input = new Input(canvas, ui);
    this.world = new World();
    this.scene.add(this.world.root);
    this.bubbles = new Bubbles(ui, this.camera);

    const avatar = save.avatar ?? defaultAvatar('girl');
    const look = save.look ?? defaultLook(avatar.identity);
    this.player = new Player(new Character(appearanceOf(avatar), look, true));
    this.scene.add(this.player.char.root);
    this.hud = new Hud(this, ui);
    this.fade = document.createElement('div');
    this.fade.className = 'fade';
    ui.append(this.fade);

    for (const m of [...ADULTS, ...parents(avatar.skin)]) this.addPerson(m);
    for (const m of classmates()) this.kids.push(this.addPerson(m));

    // guide arrow at your feet and a beacon at the destination
    const arrowGeo = new THREE.ConeGeometry(0.28, 0.7, 3);
    arrowGeo.rotateX(Math.PI / 2);
    arrowGeo.scale(1, 0.25, 1);
    this.guideArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthTest: false }));
    this.guideArrow.renderOrder = 5;
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    this.scene.add(this.guideArrow, this.beacon);

    this.director = new Director(this);
    this.starbucks = new Starbucks(this);
    initSound(save.settings.sound);
    hangArtwork(this);
    this.applyQuality();
    this.applyUpgrades();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
      if (document.hidden) this.persist();
    });
    this.resize();
    (window as unknown as { game: Game }).game = this;
  }

  private addPerson(m: CastMember) {
    const c = new Character(m.appearance, m.look, m.kid);
    c.name = m.name;
    const npc = new Npc(c, m.id);
    npc.walkSpeed = m.kid ? 1.25 : 1.15;
    this.people.set(m.id, npc);
    this.scene.add(c.root);
    npc.place(new THREE.Vector3(0, 0, 400), 0);
    c.root.visible = false;
    return npc;
  }

  person(id: string) {
    const p = this.people.get(id);
    if (!p) throw new Error('no person ' + id);
    return p;
  }

  get name() {
    return this.save.avatar?.name || 'friend';
  }

  // ------------------------------------------------------------ lifecycle

  start() {
    this.renderer.setAnimationLoop(() => this.frame());
    if (!this.save.avatar) {
      this.beginDay();
      this.clock.paused = true;
      this.player.char.setLook(this.save.look ?? defaultLook('girl'));
      this.openWardrobe('create');
    } else {
      this.beginDay();
    }
  }

  /** Puts you in your bedroom at the start of the day. */
  beginDay() {
    this.day = new DayState(this.save.day, this.save.today);
    this.clock.minutes = DAY_START;
    this.clock.paused = false;
    this.holdClock = 0;
    this.outfitBreak = false;
    this.dressed = this.day.done.has('dress');
    this.boostUntil = 0;
    this.player.stand();
    const wake = this.world.spot('wake');
    this.player.teleport(wake.pos, wake.yaw);
    this.rig.behind(wake.yaw);
    this.rig.mode = 'follow';
    // start each morning with a wide view of your room
    this.rig.pitch = 0.5;
    this.rig.dist = 6.5;
    this.refreshPlayerLook();
    for (const k of this.kids) {
      k.busy = false;
      k.steer = null;
      k.place(new THREE.Vector3(0, 0, 400), 0);
    }
    this.director.reset();
    this.starbucks?.reset();
    this.applyUpgrades();
    this.hud.toast(`☀️ Good morning, ${this.name}! It's day ${this.save.day}.`, 'good', 4);
  }

  refreshPlayerLook() {
    const look = this.save.look ?? defaultLook('girl');
    this.player.char.setLook(this.dressed ? look : pajamas(look));
  }

  persist() {
    if (this.day) this.save.today = this.day.toSave();
    writeSave(this.save);
  }

  applyQuality() {
    const high = this.save.settings.quality === 'high';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.5 : 1));
    this.resize();
  }

  applyUpgrades() {
    const u = this.save.upgrades;
    const boost = this.clock.minutes < this.boostUntil ? 1.15 : 1;
    this.player.speedMult = speedMultiplier(u.speed ?? 0) * boost;
    this.player.jumpMult = jumpMultiplier(u.jump ?? 0);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ tasks and cash

  completeTask(id: string) {
    if (!this.day.tasks.some((t) => t.id === id) || this.day.done.has(id)) return;
    this.day.done.add(id);
    const label = this.day.tasks.find((t) => t.id === id)!.label;
    const pay = CASH_PER_TASK + (this.save.upgrades.piggy ?? 0);
    this.save.cash += pay;
    this.day.cashEarned += pay;
    this.hud.toast(`✅ ${label}  +$${pay}`, 'good');
    sfx.cash();
    if (this.day.done.size === this.day.tasks.length) {
      this.save.cash += CASH_ALL_TASKS_BONUS;
      this.day.cashEarned += CASH_ALL_TASKS_BONUS;
      setTimeout(() => this.hud.toast(`🎉 Every task done today! Bonus +$${CASH_ALL_TASKS_BONUS}`, 'good', 5), 900);
    }
    this.persist();
  }

  toast(text: string, kind: '' | 'good' | 'bad' = '', seconds = 3) {
    this.hud.toast(text, kind, seconds);
  }

  // ------------------------------------------------------------ menus

  openWardrobe(mode: 'create' | 'wardrobe') {
    if (this.modal || (mode === 'wardrobe' && this.sceneLock > 0 && !this.outfitBreak)) return;
    const seatedYaw = this.player.seat ? this.player.yaw : null;
    this.modal = true;
    this.hud.setVisible(false);
    this.input.setMoveEnabled(false);
    const prevMode = this.rig.mode;
    this.rig.mode = 'showcase';
    this.rig.showcaseCenter = window.innerWidth > 900 ? 0.3 : 0.25;
    this.faceOpenSpace();
    // show the outfit, not pajamas
    this.player.char.setLook(this.save.look ?? defaultLook('girl'));
    new Creator(this, mode, () => {
      this.modal = false;
      this.hud.setVisible(true);
      this.rig.mode = prevMode === 'showcase' ? 'follow' : prevMode;
      if (seatedYaw !== null) {
        // back in your chair facing the board
        this.player.yaw = seatedYaw;
        this.player.sync();
      }
      this.rig.behind(this.player.yaw);
      this.input.setMoveEnabled(!this.player.locked);
      if (mode === 'create') {
        // parents share your skin tone
        for (const m of parents(this.save.avatar!.skin)) {
          const p = this.person(m.id);
          p.char.setAppearance(m.appearance);
        }
        this.clock.paused = false;
        this.beginDay();
        this.director.home.greet();
      } else {
        if (!this.dressed) {
          this.dressed = true;
          this.completeTask('dress');
        }
        this.refreshPlayerLook();
        this.persist();
      }
    });
  }

  /** Turns the player toward the most open direction so the showcase camera in front of them is not inside a wall. */
  private faceOpenSpace() {
    const o = this.player.pos.clone().setY(this.player.pos.y + 1.1);
    const d = new THREE.Vector3();
    let best = this.player.yaw;
    let bestDist = -1;
    for (let i = 0; i < 16; i++) {
      const yaw = this.player.yaw + (i * Math.PI) / 8;
      d.set(Math.sin(yaw), 0, Math.cos(yaw));
      const dist = Math.min(3, this.world.colliders.raycast(o, d, 3));
      if (dist > bestDist + 0.05) ((bestDist = dist), (best = yaw));
    }
    this.player.yaw = best;
    this.player.sync();
  }

  openSchedule() {
    if (this.modal) return;
    this.modal = true;
    openSchedule(this);
    // the sheet closes itself; poll for its removal
    const check = () => (this.ui.querySelector('.overlay .sheet') ? requestAnimationFrame(check) : (this.modal = false));
    requestAnimationFrame(check);
  }

  /** Text Mom and Dad on your watch (after school). */
  openWatch() {
    if (this.modal) return;
    if (!openWatch(this)) return;
    this.modal = true;
    const check = () => (this.ui.querySelector('.overlay .sheet') ? requestAnimationFrame(check) : (this.modal = false));
    requestAnimationFrame(check);
  }

  openShop() {
    if (this.modal) return;
    this.modal = true;
    openShop(this);
    const check = () => (this.ui.querySelector('.overlay .sheet') ? requestAnimationFrame(check) : (this.modal = false));
    requestAnimationFrame(check);
  }

  // ------------------------------------------------------------ sleeping

  async sleep() {
    if (this.sleeping) return;
    this.sleeping = true;
    this.clock.paused = true;
    this.player.stand();
    this.bubbles.clear();
    // anything with attendance that never happened is an absence
    for (const b of this.day.blocks) if (b.attendance && !this.day.attendance.has(b.id)) this.day.attendance.set(b.id, 'absent');
    const att = [...this.day.attendance];
    const title = (id: string) => this.day.block(id)?.title ?? id;
    const rec = {
      day: this.save.day,
      attended: att.filter(([, v]) => v === 'ontime').map(([k]) => title(k)),
      late: att.filter(([, v]) => v === 'late').map(([k]) => title(k)),
      absent: att.filter(([, v]) => v === 'absent').map(([k]) => title(k)),
      tasksDone: this.day.done.size,
      tasksTotal: this.day.tasks.length,
      cashEarned: this.day.cashEarned,
    };
    const tot = this.save.totals;
    tot.attended += rec.attended.length;
    tot.late += rec.late.length;
    tot.absent += rec.absent.length;
    if (rec.tasksDone === rec.tasksTotal) tot.perfectDays++;
    this.save.history.push(rec);
    if (this.save.history.length > 30) this.save.history.shift();
    this.save.day++;
    this.save.today = null;
    this.director.endDay();
    writeSave(this.save);
    this.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 450));
    const lines = rec.tasksDone === rec.tasksTotal ? ['🌟 Perfect day! Every task done.'] : [];
    await showSleep(this.ui, rec, lines);
    this.beginDay();
    this.director.home.greet();
    this.fade.classList.remove('on');
    this.sleeping = false;
  }

  // ------------------------------------------------------------ guide

  guideInfo(): GuideInfo {
    const t = this.clock.minutes;
    const b = this.day.targetBlock(t);
    if (!b) {
      const allDone = this.day.done.size === this.day.tasks.length;
      if (t >= SCHOOL_OUT) {
        const left = this.day.tasks.filter((x) => !this.day.done.has(x.id));
        if (left.length && !allDone) return { title: `Evening: ${left[0].label}`, sub: left.length > 1 ? `and ${left.length - 1} more task${left.length > 2 ? 's' : ''}` : 'last task of the day!', late: false, place: left[0].id === 'homework' ? 'bedroom' : left[0].id === 'dinner' ? 'kitchen' : null };
        return { title: 'Bedtime whenever you like 🌙', sub: 'Sleep in your bed to start tomorrow', late: false, place: 'bedroom' };
      }
      return { title: 'Free time', sub: '', late: false, place: null };
    }
    const where = PLACE_NAMES[b.place];
    // Already at the thing happening now (in class, at practice, at recess): no arrow.
    const now = this.day.blocks.find((x) => t >= x.start && t < x.end && x.kind !== 'evening');
    if (now && now !== b && now.kind !== 'home' && this.day.finished(now) && inPlace(this.zone, now.place)) return { title: `Now: ${now.title}`, sub: `then ${b.title} at ${formatTime(b.start)}`, late: false, place: null };
    if (t < b.start) {
      const mins = Math.ceil(b.start - t);
      return { title: `Next: ${b.title}`, sub: `${where} · ${mins > 60 ? 'at ' + formatTime(b.start) : `in ${mins} min`}`, late: false, place: b.place };
    }
    if (b.attendance && t > b.start + LATE_GRACE_MINUTES) return { title: `${b.title} started!`, sub: `Hurry to ${where} · you're late`, late: true, place: b.place };
    if (b.id === 'evening') {
      const dinnerReady = t >= 16 * 60;
      return { title: dinnerReady ? 'Dinner is ready!' : 'Evening at home', sub: dinnerReady ? 'Sit at the kitchen table' : `Homework, Starbucks, or play · dinner at 4:00 PM`, late: false, place: dinnerReady ? 'kitchen' : this.day.done.has('homework') ? null : 'bedroom' };
    }
    return { title: `Now: ${b.title}`, sub: where, late: false, place: b.place };
  }

  private updateGuide(dt: number) {
    const info = this.guideInfo();
    const place = info.place;
    const show = this.guideOn && place && !inPlace(this.zone, place) && !this.player.locked && !this.modal;
    this.guideArrow.visible = this.beacon.visible = !!show;
    if (!show || !place) return;
    const [tx, tz] = PLACE_TARGET[place];
    this.beacon.position.set(tx, 15, tz);
    this.guideTimer -= dt;
    if (this.guideTimer <= 0 || !this.guidePath.length) {
      this.guideTimer = 0.5;
      // inside the house, lead to the stairs when the place is on the other floor
      const inHome = this.zone?.building === 'home';
      const have = floorOf(this.player.pos.y);
      const want = place === 'bedroom' ? 1 : 0;
      let to: [number, number] = [tx, tz];
      const inBedroom = this.zone?.id === 'bedroom';
      // upstairs, the bedroom door is the way between your room and the hall
      if (have === 1 && inBedroom !== (want === 1)) to = BEDROOM_DOOR;
      else if (inHome && have !== want) to = have === 0 ? STAIR_BOTTOM : STAIR_TOP;
      const target = new THREE.Vector3(to[0], 0, to[1]);
      this.guidePath = inHome ? [target] : this.world.nav.path(this.player.pos, target);
    }
    let next = this.guidePath[0];
    while (this.guidePath.length > 1 && next.distanceTo(this.player.pos) < 1.2) {
      this.guidePath.shift();
      next = this.guidePath[0];
    }
    const dx = next.x - this.player.pos.x;
    const dz = next.z - this.player.pos.z;
    const yaw = Math.atan2(dx, dz);
    const bob = Math.sin(performance.now() / 180) * 0.12;
    this.guideArrow.position.set(this.player.pos.x + Math.sin(yaw) * (1.1 + bob), this.player.pos.y + 0.12, this.player.pos.z + Math.cos(yaw) * (1.1 + bob));
    this.guideArrow.rotation.set(0, yaw, 0);
  }

  // ------------------------------------------------------------ actions

  currentActions(): Action[] {
    if (this.modal || this.sleeping) return [];
    const out: Action[] = [];
    for (const a of this.director.actions()) out.push(a);
    if (!this.player.locked || this.player.seat) {
      const near = this.interactions.nearest(this.player.pos);
      if (near && !this.player.seat) out.push({ label: labelOf(near), use: () => near.use() });
    }
    if (this.player.seat && this.sceneLock === 0 && !out.some((a) => a.label === 'Stand up')) out.push({ label: 'Stand up', use: () => this.standUp() });
    return out.slice(0, 3);
  }

  standUp() {
    this.player.stand();
    this.input.setMoveEnabled(true);
    this.rig.mode = 'follow';
  }

  /** Sits the player down and hides the joystick. */
  sitPlayer(seat: Parameters<Player['sit']>[0], pose: Parameters<Player['sit']>[1] = 'sit') {
    this.player.sit(seat, pose);
    this.input.setMoveEnabled(false);
    this.rig.behind(seat.yaw);
    this.rig.pitch = 0.45;
  }

  // ------------------------------------------------------------ frame

  private frame() {
    const now = performance.now();
    const real = (now - this.last) / 1000;
    const dt = Math.min(0.05, real);
    this.last = now;
    if (document.hidden) return;
    this.fps.frames++;
    this.fps.t += real;
    if (this.fps.t > 1) {
      this.fps.value = this.fps.frames / this.fps.t;
      this.fps.frames = 0;
      this.fps.t = 0;
    }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** Runs game logic for `seconds` without drawing. Used by tests and to skip ahead. */
  simulate(seconds: number, step = 0.05) {
    for (let t = 0; t < seconds; t += step) this.update(step);
  }

  private update(dt: number) {

    // menus and classes stop the clock, so changing clothes or reading slowly never makes you late
    if (!this.clock.paused && !this.modal && this.holdClock === 0 && this.day) {
      this.clock.minutes += dt * GAME_MINUTES_PER_REAL_SECOND;
      if (this.clock.minutes >= BEDTIME_LIMIT && !this.sleeping) {
        this.toast('😴 It is 11:59 PM. You fell asleep!');
        void this.sleep();
      }
    }

    // camera input
    const cam = this.input.consumeCamera();
    if (this.rig.mode === 'showcase') this.player.yaw -= cam.dx * 0.01;
    else this.rig.rotate(cam.dx, cam.dy);
    this.rig.zoomBy(cam.zoom);

    // movement relative to the camera
    const m = this.input.readMove();
    _fwd.set(-Math.sin(this.rig.yaw), 0, -Math.cos(this.rig.yaw));
    _move.set(0, 0, 0).addScaledVector(_fwd, m.y).add(new THREE.Vector3(-_fwd.z, 0, _fwd.x).multiplyScalar(m.x));
    if (this.modal) _move.set(0, 0, 0);
    this.player.update(dt, _move, this.input.consumeJump() && !this.modal, this.world.colliders);
    if (this.input.consumeAction()) this.currentActions()[0]?.use();

    // where are we?
    this.zone = zoneAt(this.player.pos.x, this.player.pos.z, this.player.pos.y);
    // cutaway: inside a building its roof lifts off, and downstairs its upstairs does too
    const upstairs = floorOf(this.player.pos.y) === 1;
    for (const [name, roof] of this.world.roofs) roof.visible = this.zone?.building !== name;
    for (const [name, upper] of this.world.uppers) upper.visible = upstairs || this.zone?.building !== name;
    this.rig.ceil = this.zone?.building === 'home' && !upstairs ? UPSTAIRS - 0.2 : Infinity;

    if (this.day && !this.sleeping) {
      if (this.boostUntil && this.clock.minutes >= this.boostUntil) {
        this.boostUntil = 0;
        this.applyUpgrades();
        this.toast('Your Starbucks boost wore off');
      }
      this.director.update(dt);
      this.starbucks.update(dt);
    }

    // people
    const camPos = this.camera.position;
    for (const p of this.people.values()) {
      const d = p.pos.distanceTo(camPos);
      const far = d > 48;
      p.update(dt, this.world.colliders, far);
      const vis = d < 95 && p.pos.z < 300;
      p.char.root.visible = vis;
      if (vis) p.char.update(dt);
    }
    this.separate();
    this.player.char.update(dt);

    this.rig.update(dt, this.player.pos, this.player.yaw, this.player.char.headHeight, this.world.colliders);
    this.world.setTimeOfDay(this.clock.minutes, this.scene);
    this.updateGuide(dt);
    this.bubbles.update(dt);
    this.hud.update();
  }

  /** Keeps people from standing inside each other. */
  private separate() {
    const list: { pos: THREE.Vector3; fixed: boolean }[] = [{ pos: this.player.pos, fixed: !!this.player.seat }];
    for (const p of this.people.values()) if (p.char.root.visible && !p.seat) list.push({ pos: p.pos, fixed: false });
    const r = 0.55;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r || d2 < 1e-6 || a.fixed || b.fixed) continue;
        const d = Math.sqrt(d2);
        const push = (r - d) * 0.5;
        a.pos.x -= (dx / d) * push;
        a.pos.z -= (dz / d) * push;
        b.pos.x += (dx / d) * push;
        b.pos.z += (dz / d) * push;
      }
    this.player.sync();
  }

  get fpsValue() {
    return this.fps.value;
  }
}
