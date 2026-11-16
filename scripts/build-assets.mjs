// Builds the game's character assets in public/models from the Quaternius source packs (CC0).
//
// Sources (download the free [Standard] zips from itch.io and unzip them into one folder):
//   https://quaternius.itch.io/universal-base-characters
//   https://quaternius.itch.io/universal-animation-library
//   https://quaternius.itch.io/universal-animation-library-2
//
// Usage: ASSET_SRC=/path/to/unzipped/packs node scripts/build-assets.mjs
//
// What it does, to keep iPad Safari memory low:
//   - bodies: keeps only position/normal/uv/skin attributes, resizes textures to 1024 JPEG, drops roughness maps
//   - hair.glb: every hairstyle and eyebrow mesh in one file, transforms baked, 512 px textures
//   - anims.glb: only the animation clips the game uses, with no meshes
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, unpartition, resample } from '@gltf-transform/functions';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SRC = process.env.ASSET_SRC;
if (!SRC) throw new Error('Set ASSET_SRC to the folder holding the unzipped Quaternius packs');
const OUT = new URL('../public/models/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const io = new NodeIO();

function find(name) {
  const stack = [SRC];
  while (stack.length) {
    const d = stack.pop();
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) stack.push(p);
      else if (p.endsWith(name)) return p;
    }
  }
  throw new Error('missing ' + name);
}

const tmp = join(tmpdir(), 'sabin-assets');
mkdirSync(tmp, { recursive: true });
function resizeImage(bytes, size, fmt = 'jpg', quality = 82) {
  const i = join(tmp, 'in.png');
  const o = join(tmp, 'out.' + fmt);
  writeFileSync(i, bytes);
  execFileSync('magick', [i, '-resize', `${size}x${size}`, '-quality', String(quality), o]);
  return new Uint8Array(readFileSync(o));
}

const KEEP_ATTRS = new Set(['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']);
function slimPrims(doc) {
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      for (const sem of prim.listSemantics()) if (!KEEP_ATTRS.has(sem)) prim.setAttribute(sem, null);
}
function slimTextures(doc, sizeFor) {
  for (const tex of doc.getRoot().listTextures()) {
    const name = tex.getName() || tex.getURI();
    const size = sizeFor(name);
    tex.setImage(resizeImage(tex.getImage(), size)).setMimeType('image/jpeg').setURI('');
  }
}

// ---------- bodies ----------
for (const [src, out] of [
  ['Superhero_Female_FullBody.gltf', 'body_f.glb'],
  ['Superhero_Male_FullBody.gltf', 'body_m.glb'],
]) {
  const doc = await io.read(find(src));
  for (const m of doc.getRoot().listMaterials()) {
    m.setMetallicRoughnessTexture(null).setRoughnessFactor(0.75);
  }
  doc.getRoot().listAnimations().forEach((a) => a.dispose());
  slimPrims(doc);
  await doc.transform(prune(), dedup());
  slimTextures(doc, (n) => (/Eye/.test(n) ? 256 : /Hair/.test(n) ? 512 : 1024));
  await io.write(join(OUT, out), doc);
  console.log('wrote', out, (statSync(join(OUT, out)).size / 1e6).toFixed(2), 'MB');
}

// ---------- hair ----------
{
  const HAIRS = ['Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Long', 'Hair_SimpleParted', 'Hair_Beard', 'Eyebrows_Female', 'Eyebrows_Regular'];
  const docs = [];
  for (const h of HAIRS) docs.push([h, await io.read(find(`Origin at 0/glTF (Godot)/${h}.gltf`))]);
  // Merge into the first document.
  const { mergeDocuments } = await import('@gltf-transform/functions');
  const [first, ...rest] = docs;
  const base = first[1];
  base.getRoot().listNodes()[0].setName(first[0]);
  for (const [name, d] of rest) {
    d.getRoot().listNodes()[0].setName(name);
    mergeDocuments(base, d);
  }
  // Put all nodes in one scene.
  const scenes = base.getRoot().listScenes();
  const scene = scenes[0];
  for (const s of scenes.slice(1)) {
    for (const n of s.listChildren()) scene.addChild(n);
    s.dispose();
  }
  slimPrims(base);
  await base.transform(dedup(), prune(), unpartition());
  slimTextures(base, () => 512);
  await io.write(join(OUT, 'hair.glb'), base);
  console.log('wrote hair.glb', (statSync(join(OUT, 'hair.glb')).size / 1e6).toFixed(2), 'MB');
}

// ---------- animations ----------
{
  const KEEP = new Set([
    // UAL1
    'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land',
    'Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Exit', 'Sitting_Talking_Loop', 'Idle_Talking_Loop',
    'Dance_Loop', 'Interact', 'PickUp_Table', 'Punch_Jab', 'Punch_Cross', 'Roll', 'Crouch_Idle_Loop', 'Spell_Simple_Shoot',
    // UAL2
    'Consume', 'Idle_FoldArms_Loop', 'Yes', 'Idle_No_Loop', 'OverhandThrow', 'Idle_TalkingPhone_Loop',
    'Slide_Start', 'Slide_Loop', 'Slide_Exit', 'LayToIdle', 'NinjaJump_Start', 'Walk_Carry_Loop',
  ]);
  const { mergeDocuments } = await import('@gltf-transform/functions');
  const a = await io.read(find('UAL1_Standard.glb'));
  const b = await io.read(find('UAL2_Standard.glb'));
  for (const d of [a, b]) {
    for (const anim of d.getRoot().listAnimations())
      if (!KEEP.has(anim.getName())) {
        anim.listSamplers().forEach((s) => s.dispose());
        anim.dispose();
      }
    // Drop scale tracks (all 1) and bone translations (constant except on the pelvis) to save space.
    for (const anim of d.getRoot().listAnimations())
      for (const ch of anim.listChannels()) {
        const path = ch.getTargetPath();
        const bone = ch.getTargetNode()?.getName();
        if (path === 'scale' || (path === 'translation' && bone !== 'pelvis')) { ch.getSampler()?.dispose(); ch.dispose(); continue; }
        // Fingers barely move; hold each clip's first finger pose to cut most of the keyframe data.
        if (/^(index|middle|pinky|ring|thumb)_/.test(bone || '')) {
          const s = ch.getSampler();
          const input = s.getInput();
          const output = s.getOutput();
          const n = output.getElementSize();
          s.setInput(d.createAccessor().setType('SCALAR').setArray(new Float32Array([input.getArray()[0]])));
          s.setOutput(d.createAccessor().setType(output.getType()).setArray(new Float32Array(output.getArray().slice(0, n))));
        }
      }
  }
  // Retarget UAL2 channels onto UAL1 nodes by name, then drop UAL2's nodes.
  const nodesA = new Map(a.getRoot().listNodes().map((n) => [n.getName(), n]));
  mergeDocuments(a, b);
  for (const anim of a.getRoot().listAnimations())
    for (const ch of anim.listChannels()) {
      const t = ch.getTargetNode();
      const same = t && nodesA.get(t.getName());
      if (same && same !== t) ch.setTargetNode(same);
    }
  for (const s of a.getRoot().listScenes().slice(1)) s.dispose();
  // Remove meshes and materials: the clips only need the skeleton nodes.
  for (const n of a.getRoot().listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const m of a.getRoot().listMeshes()) m.dispose();
  for (const s of a.getRoot().listSkins()) s.dispose();
  await a.transform(resample({ tolerance: 2e-4 }), prune({ keepLeaves: true }), dedup());
  for (const acc of a.getRoot().listAccessors()) if (!acc.listParents().some((p) => p.propertyType === 'AnimationSampler' && p.listParents().some((q) => q.propertyType === 'Animation'))) acc.dispose();
  await a.transform(unpartition());
  await io.write(join(OUT, 'anims.glb'), a);
  console.log('wrote anims.glb', (statSync(join(OUT, 'anims.glb')).size / 1e6).toFixed(2), 'MB', a.getRoot().listAnimations().map((x) => x.getName()).join(','));
}
rmSync(tmp, { recursive: true, force: true });
