import type { Game } from '../core/game';
import type { Avatar, Identity, Look, Worn } from '../core/save';
import { CATEGORIES, CLOTHING, CLOTHING_BY_ID, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, type Category } from '../content/clothing';
import { defaultAvatar, defaultLook } from '../game/cast';
import { appearanceOf } from '../characters/character';
import { clear, h } from '../util/dom';

type Tab = 'you' | 'body' | 'face' | 'hair' | 'clothes' | 'outfits';

/**
 * Avatar creator (first launch) and wardrobe (any time).
 * Changes show live on your character, which the camera faces on the left.
 */
export class Creator {
  private el: HTMLElement;
  private body: HTMLElement;
  private tabsEl: HTMLElement;
  private tab: Tab;
  private cat: Category = 'tops';
  private avatar: Avatar;
  private look: Look;
  private outfitName = '';

  constructor(private g: Game, private mode: 'create' | 'wardrobe', private onDone: () => void) {
    this.avatar = structuredClone(g.save.avatar ?? defaultAvatar('girl'));
    this.look = structuredClone(g.save.look ?? defaultLook(this.avatar.identity));
    this.tab = mode === 'create' ? 'you' : 'clothes';
    this.tabsEl = h('div', { class: 'tabs' });
    this.body = h('div', { class: 'sheet-body', style: 'flex:1' });
    const foot = h(
      'div',
      { class: 'creator-foot' },
      mode === 'create'
        ? h('button', { class: 'btn green', style: 'flex:1', ontap: () => this.finish() }, 'Start my day ▶')
        : h('button', { class: 'btn', style: 'flex:1', ontap: () => this.finish() }, 'Done'),
    );
    const title = mode === 'create' ? '✨ Make your character' : '👕 Wardrobe';
    this.el = h(
      'div',
      { class: 'creator' },
      h('div', { class: 'creator-left' }),
      h('div', { class: 'panel creator-panel' }, h('div', { class: 'sheet-head' }, h('h2', null, title), h('span', { class: 'badge' }, `💵 $${g.save.cash}`)), this.tabsEl, this.body, foot),
    );
    g.ui.append(this.el);
    this.apply();
    this.render();
  }

  private finish() {
    if (this.mode === 'create' && !this.avatar.name.trim()) this.avatar.name = this.avatar.identity === 'boy' ? 'Alex' : this.avatar.identity === 'girl' ? 'Leila' : 'Riley';
    this.g.save.avatar = this.avatar;
    this.g.save.look = this.look;
    this.g.persist();
    this.el.remove();
    this.onDone();
  }

  private apply() {
    const ch = this.g.player.char;
    ch.setAppearance(appearanceOf(this.avatar));
    ch.setLook(this.look);
  }

  private tabs(): [Tab, string][] {
    const all: [Tab, string][] = [
      ['you', 'You'],
      ['body', 'Body'],
      ['face', 'Face'],
      ['hair', 'Hair'],
      ['clothes', 'Clothes'],
      ['outfits', 'Outfits'],
    ];
    return this.mode === 'create' ? all.filter(([t]) => t !== 'outfits') : all.filter(([t]) => ['hair', 'clothes', 'outfits'].includes(t));
  }

  private render() {
    clear(this.tabsEl);
    for (const [t, label] of this.tabs()) this.tabsEl.append(h('button', { class: 'tab' + (t === this.tab ? ' on' : ''), ontap: () => ((this.tab = t), this.render()) }, label));
    clear(this.body);
    const b = this.body;
    const label = (s: string) => h('div', { class: 'opt-label' }, s);
    const options = <T,>(items: [T, string][], cur: T, set: (v: T) => void) =>
      h('div', { class: 'opt-grid' }, items.map(([v, name]) => h('button', { class: 'opt' + (v === cur ? ' on' : ''), ontap: () => (set(v), this.apply(), this.render()) }, name)));
    const swatches = (colors: string[], cur: string, set: (c: string) => void) =>
      h('div', { class: 'opt-grid' }, colors.map((c) => h('button', { class: 'swatch' + (c.toLowerCase() === cur.toLowerCase() ? ' on' : ''), style: `background:${c}`, ontap: () => (set(c), this.apply(), this.render()) })));

    if (this.tab === 'you') {
      const input = h('input', { class: 'name-input', value: this.avatar.name, placeholder: 'Type your name', maxlength: '16' }) as HTMLInputElement;
      input.addEventListener('input', () => (this.avatar.name = input.value));
      b.append(label('Name'), input, label('I am a…'));
      b.append(
        options<Identity>([['girl', '👧 Girl'], ['boy', '👦 Boy'], ['they', '🧒 They/them']], this.avatar.identity, (v) => {
          const name = this.avatar.name;
          this.avatar = { ...defaultAvatar(v), name, skin: this.avatar.skin };
          this.look = defaultLook(v);
        }),
      );
      b.append(h('p', { style: 'opacity:.65;font-size:15px' }, 'You can change your body, face, hair, and clothes in the next tabs. Later, hair and clothes can be changed any time with the 👕 button.'));
    } else if (this.tab === 'body') {
      b.append(label('Body type'), options<'f' | 'm'>([['f', 'Body 1'], ['m', 'Body 2']], this.avatar.body, (v) => (this.avatar.body = v)));
      b.append(label('Height'), options<number>([[0.94, 'Shorter'], [1, 'Medium'], [1.06, 'Taller']], this.avatar.height, (v) => (this.avatar.height = v)));
      b.append(label('Build'), options<number>([[0.93, 'Slim'], [1, 'Medium'], [1.08, 'Sturdy']], this.avatar.build, (v) => (this.avatar.build = v)));
      b.append(label('Skin color'), swatches(SKIN_TONES, this.avatar.skin, (c) => (this.avatar.skin = c)));
    } else if (this.tab === 'face') {
      b.append(label('Eye color'), swatches(EYE_COLORS, this.avatar.eyes, (c) => (this.avatar.eyes = c)));
      b.append(label('Freckles'), options<boolean>([[false, 'None'], [true, 'Freckles']], this.avatar.freckles, (v) => (this.avatar.freckles = v)));
      b.append(label('Glasses'), options<boolean>([[false, 'No glasses'], [true, '👓 Glasses']], this.avatar.glasses, (v) => (this.avatar.glasses = v)));
    } else if (this.tab === 'hair') {
      b.append(label('Hairstyle'));
      b.append(
        h(
          'div',
          { class: 'opt-grid' },
          HAIR_STYLES.map((s) => {
            const locked = !!s.price && !this.g.save.unlocked.includes(s.id);
            return h('button', { class: 'opt' + (s.id === this.look.hair ? ' on' : '') + (locked ? ' locked' : ''), ontap: () => this.choose(s.id, s.price ?? 0, () => (this.look.hair = s.id)) }, s.name, locked ? h('span', { class: 'price' }, `🔒 $${s.price}`) : null);
          }),
        ),
      );
      b.append(label('Hair color'), swatches(HAIR_COLORS, this.look.hairColor, (c) => (this.look.hairColor = c)));
    } else if (this.tab === 'clothes') {
      b.append(h('div', { class: 'opt-grid', style: 'margin-bottom:6px' }, CATEGORIES.map((c) => h('button', { class: 'tab' + (c.id === this.cat ? ' on' : ''), ontap: () => ((this.cat = c.id), this.render()) }, c.name))));
      const cat = CATEGORIES.find((c) => c.id === this.cat)!;
      const slot = cat.slot;
      const worn = this.look[slot] as Worn | null;
      const items = CLOTHING.filter((c) => c.category === this.cat);
      const grid = h('div', { class: 'opt-grid' });
      if (cat.optional) grid.append(h('button', { class: 'opt' + (!worn ? ' on' : ''), ontap: () => ((this.look[slot as 'hat' | 'backpack'] = null), this.apply(), this.render()) }, 'None'));
      for (const it of items) {
        const locked = !!it.price && !this.g.save.unlocked.includes(it.id);
        grid.append(
          h(
            'button',
            { class: 'opt' + (worn?.id === it.id ? ' on' : '') + (locked ? ' locked' : ''), ontap: () => this.choose(it.id, it.price ?? 0, () => ((this.look[slot] as Worn | null) = { id: it.id, color: it.colors[0], color2: it.colors[1] })) },
            it.name,
            locked ? h('span', { class: 'price' }, `🔒 $${it.price}`) : null,
          ),
        );
      }
      b.append(grid);
      if (worn) {
        const item = CLOTHING_BY_ID.get(worn.id);
        if (item && item.pattern !== 'rainbow') {
          b.append(label('Main color'), swatches(CLOTH_COLORS, worn.color, (c) => (worn.color = c)));
          if (item.pattern !== 'solid' || ['hats', 'backpacks'].includes(item.category))
            b.append(label(item.pattern === 'twoTone' ? 'Trim color' : 'Pattern color'), swatches(CLOTH_COLORS, worn.color2, (c) => (worn.color2 = c)));
        }
      }
    } else if (this.tab === 'outfits') {
      const input = h('input', { class: 'name-input', value: this.outfitName, placeholder: 'Name this outfit', maxlength: '20' }) as HTMLInputElement;
      input.addEventListener('input', () => (this.outfitName = input.value));
      const save = h('button', { class: 'btn green', style: 'white-space:nowrap' }, 'Save outfit');
      save.addEventListener('click', () => {
        const name = this.outfitName.trim() || `Outfit ${this.g.save.outfits.length + 1}`;
        const existing = this.g.save.outfits.find((o) => o.name === name);
        if (existing) existing.look = structuredClone(this.look);
        else this.g.save.outfits.push({ name, look: structuredClone(this.look) });
        this.outfitName = '';
        this.g.persist();
        this.g.toast(`Saved "${name}"`, 'good');
        this.render();
      });
      b.append(label('Save what you are wearing'), h('div', { style: 'display:flex;gap:10px' }, input, save), label(`Your outfits (${this.g.save.outfits.length})`));
      if (!this.g.save.outfits.length) b.append(h('p', { style: 'opacity:.6' }, 'No saved outfits yet. Dress up, name it, and tap Save. Tap a saved outfit to wear it.'));
      this.g.save.outfits.forEach((o, i) => {
        const row = h(
          'div',
          { class: 'outfit-row' },
          h('div', { class: 'name' }, o.name),
          h('div', { style: 'display:flex;gap:4px' }, [o.look.top.color, o.look.bottom.color, o.look.shoes.color].map((c) => h('span', { class: 'swatch', style: `width:26px;height:26px;background:${c}` }))),
          h('button', { class: 'btn small', ontap: () => ((this.look = structuredClone(o.look)), this.apply(), this.g.toast(`Wearing "${o.name}"`), this.render()) }, 'Wear'),
          h('button', { class: 'close-btn', style: 'width:40px;height:40px;font-size:18px', ontap: () => (this.g.save.outfits.splice(i, 1), this.g.persist(), this.render()) }, '🗑'),
        );
        b.append(row);
      });
    }
  }

  /** Equips an item, buying it first if it is locked. */
  private choose(id: string, price: number, equip: () => void) {
    const s = this.g.save;
    if (price && !s.unlocked.includes(id)) {
      if (s.cash < price) {
        this.g.toast(`That costs $${price}. Finish daily tasks to earn cash!`, 'bad');
        return;
      }
      s.cash -= price;
      s.unlocked.push(id);
      this.g.persist();
      this.g.toast(`Unlocked for $${price}!`, 'good');
      const badge = this.el.querySelector('.sheet-head .badge');
      if (badge) badge.textContent = `💵 $${s.cash}`;
    }
    equip();
    this.apply();
    this.render();
  }
}
