import * as THREE from 'three';
import { CLOTHING_BY_ID, PATTERNS } from '../content/clothing';
import type { Look } from '../core/save';
import type { BodyType } from './assets';

/**
 * Paints skin tone and clothes onto the base body with a shader, so outfits cost no extra meshes.
 * Coverage comes from per-vertex limb coordinates (see tagBodyParts in assets.ts):
 *   arm coordinate: torso -0.5, shoulder 0 -> elbow 1 -> wrist 2, hand 2.5
 *   leg coordinate: hips -0.5, hip 0 -> knee 1 -> ankle 2, foot 2.5
 */

/** Rest-pose landmarks per body, in model meters. */
export const BODY_LANDMARKS: Record<BodyType, { waist: number; chest: number; foot: number; head: THREE.Vector3; headTop: number; spine: THREE.Vector3; pelvis: THREE.Vector3 }> = {
  f: { waist: 1.0, chest: 1.3, foot: 0.071, head: new THREE.Vector3(0, 1.55, -0.011), headTop: 1.78, spine: new THREE.Vector3(0, 1.291, -0.002), pelvis: new THREE.Vector3(0, 0.932, -0.046) },
  m: { waist: 1.02, chest: 1.33, foot: 0.086, head: new THREE.Vector3(0, 1.6, -0.017), headTop: 1.82, spine: new THREE.Vector3(0, 1.311, 0.007), pelvis: new THREE.Vector3(0, 0.949, -0.043) },
};

export interface LookUniforms {
  [k: string]: THREE.IUniform;
}

function slotUniforms(prefix: string) {
  return {
    [`u${prefix}C1`]: { value: new THREE.Color() },
    [`u${prefix}C2`]: { value: new THREE.Color() },
    [`u${prefix}Pat`]: { value: 0 },
    [`u${prefix}Len`]: { value: 0 },
    [`u${prefix}Infl`]: { value: 0 },
  };
}

export function makeBodyMaterial(src: THREE.MeshStandardMaterial, body: BodyType) {
  const mat = new THREE.MeshStandardMaterial({
    map: src.map,
    normalMap: src.normalMap,
    roughness: 0.7,
    metalness: 0,
  });
  const L = BODY_LANDMARKS[body];
  const uniforms: LookUniforms = {
    uSkin: { value: new THREE.Color('#c98e66') },
    uWaist: { value: L.waist },
    uChest: { value: L.chest },
    uFootY: { value: L.foot },
    uHeadY: { value: L.head.y },
    uFreckles: { value: 0 },
    uSkirt: { value: 0 },
    uSmooth: { value: 1 },
    ...slotUniforms('Top'),
    ...slotUniforms('Bot'),
    ...slotUniforms('Shoe'),
  };
  mat.userData.look = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `#include <beginnormal_vertex>
objectNormal = normalize(mix(objectNormal, aSmoothN, uSmooth));`,
      )
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
attribute float aPart;
attribute float aAlong;
attribute vec3 aSmooth;
attribute vec3 aSmoothN;
uniform float uWaist, uTopLen, uBotLen, uShoeLen, uTopInfl, uBotInfl, uShoeInfl, uSkirt, uSmooth;
varying float vArm;
varying float vLeg;
varying float vHead;
varying vec3 vRest;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
transformed = mix(transformed, aSmooth, uSmooth);
{
  float p = floor(aPart + 0.5);
  vArm = p == 3.0 ? aAlong : p == 4.0 ? 1.0 + aAlong : p == 5.0 ? 2.5 : (p == 1.0 || p == 9.0 || p == 2.0) ? -0.5 : -5.0;
  vLeg = p == 6.0 ? aAlong : p == 7.0 ? 1.0 + aAlong : p == 8.0 ? 2.5 : (p == 2.0 || p == 1.0) ? -0.5 : -5.0;
  vHead = p == 0.0 ? 1.0 : 0.0;
  vRest = position;
  float top = (vArm > -0.6 && vArm < uTopLen && (vArm > -0.1 || position.y > uWaist - 0.02)) ? 1.0 : 0.0;
  float bot = (vLeg > -0.6 && vLeg < uBotLen && (vLeg > -0.1 || position.y < uWaist + 0.02)) ? 1.0 : 0.0;
  float shoe = vLeg > 1.0 + uShoeLen ? 1.0 : 0.0;
  float infl = max(top * uTopInfl, max(bot * uBotInfl * (1.0 - uSkirt * step(-0.1, vLeg)), shoe * uShoeInfl));
  transformed += normal * infl;
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
uniform vec3 uSkin, uTopC1, uTopC2, uBotC1, uBotC2, uShoeC1, uShoeC2;
uniform float uTopPat, uBotPat, uShoePat, uTopLen, uBotLen, uShoeLen, uWaist, uChest, uFootY, uHeadY, uFreckles, uSkirt, uSmooth;
float skinFlat = 0.0;
varying float vArm;
varying float vLeg;
varying float vHead;
varying vec3 vRest;
float clothAmt = 0.0;

vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
float sdStar(vec2 p, float r) {
  float a = atan(p.x, p.y);
  float seg = 6.2831853 / 5.0;
  a = mod(a + seg * 0.5, seg) - seg * 0.5;
  vec2 q = length(p) * vec2(cos(a), abs(sin(a)));
  return q.x * 0.81 + q.y * 0.59 - r * 0.81 - (q.x > r ? 0.0 : 0.0);
}
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  p.y += 0.6;
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)), dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// slot: 0 top, 1 bottom, 2 shoes
vec3 pattern(float pat, vec3 c1, vec3 c2, vec3 P, float slot) {
  vec2 chest = vec2(P.x, P.y - uChest);
  bool front = P.z > 0.02 && vArm < -0.1;
  if (pat < 0.5) return c1;
  if (pat < 1.5) return fract(P.y * 11.0) < 0.5 ? c1 : c2;
  if (pat < 2.5) {
    vec2 uv = vec2((P.x + P.z) * 16.0, P.y * 16.0);
    return length(fract(uv) - 0.5) < 0.2 ? c2 : c1;
  }
  if (pat < 3.5) {
    float a = step(0.5, fract(P.y * 7.0));
    float b = step(0.5, fract((P.x + P.z) * 7.0));
    float line = step(0.92, fract(P.y * 14.0)) + step(0.92, fract((P.x + P.z) * 14.0));
    return mix(mix(c1, c2, (a + b) * 0.35), vec3(1.0), min(line, 1.0) * 0.18);
  }
  if (pat < 4.5) {
    if (slot < 0.5) return vArm > -0.05 ? c2 : c1;
    if (slot > 1.5) return (P.y < uFootY - 0.035 || (vLeg > 2.0 && P.z > 0.08)) ? c2 : c1;
    return c1;
  }
  if (pat < 5.5) return (front && sdStar(chest, 0.07) < 0.0) ? c2 : c1;
  if (pat < 6.5) return (front && sdHeart(chest / 0.11) < 0.0) ? c2 : c1;
  if (pat < 7.5) return (abs(P.z + 0.03) < 0.022 && abs(P.x) > 0.1) ? c2 : c1;
  if (pat < 8.5) {
    float n = sin(P.x * 31.0 + sin(P.y * 23.0)) * sin(P.y * 27.0 + P.z * 29.0) + 0.5 * sin(P.z * 41.0 + P.y * 13.0);
    return n > 0.35 ? c2 : n < -0.45 ? c1 * 0.6 : c1;
  }
  if (pat < 9.5) return mix(hue(fract(P.y * 2.2)), vec3(1.0), 0.15);
  if (pat < 10.5) {
    vec2 q = vec2(P.x, P.y - uChest + 0.02);
    float s = P.z > 0.0 ? 1.0 : 1.5;
    q /= s;
    float one = sdSeg(q, vec2(-0.045, -0.05), vec2(-0.045, 0.05));
    float zero = abs(length((q - vec2(0.03, 0.0)) * vec2(1.6, 1.0)) - 0.05);
    return (vArm < -0.1 && min(one, zero) < 0.012) ? c2 : c1;
  }
  if (pat < 11.5) {
    float w = 0.9 + 0.1 * sin((P.x + P.y + P.z) * 900.0) * sin((P.x - P.y) * 700.0);
    float seam = (slot > 0.5 && abs(P.z + 0.0) < 0.004) ? 1.0 : 0.0;
    return mix(c1 * w, c2 * 1.6, seam);
  }
  if (pat < 12.5) {
    vec2 uv = vec2((P.x + P.z) * 9.0, P.y * 9.0);
    vec2 f = fract(uv) - 0.5;
    float r = length(f);
    float a = atan(f.y, f.x);
    if (r < 0.07) return vec3(1.0, 0.85, 0.2);
    return r < 0.2 + 0.08 * cos(a * 5.0) ? c2 : c1;
  }
  {
    vec2 q = chest;
    float d = min(min(sdSeg(q, vec2(0.03, 0.09), vec2(-0.03, 0.0)), sdSeg(q, vec2(-0.03, 0.0), vec2(0.03, 0.0))), sdSeg(q, vec2(0.03, 0.0), vec2(-0.03, -0.09)));
    return (front && d < 0.014) ? c2 : c1;
  }
}`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
{
  const vec3 SKIN_AVG = vec3(0.397, 0.168, 0.080);
  vec3 base = diffuseColor.rgb;
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722)) / dot(SKIN_AVG, vec3(0.2126, 0.7152, 0.0722));
  vec3 skin = clamp(base / SKIN_AVG, 0.0, 1.6) * uSkin;
  // the texture has muscle shading painted in; soften it on the body (not the face)
  skinFlat = vHead > 0.5 ? 0.0 : uSmooth * 0.7;
  skin = mix(skin, uSkin * 0.95, skinFlat);
  diffuseColor.rgb = skin;
  if (vHead > 0.5 && uFreckles > 0.5) {
    vec3 P = vRest;
    float dy = P.y - (uHeadY + 0.085);
    if (P.z > 0.06 && abs(dy) < 0.022 && abs(P.x) > 0.012 && abs(P.x) < 0.05) {
      vec2 g = floor(P.xy * 260.0);
      float h = fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453);
      if (h > 0.82) diffuseColor.rgb *= 0.72;
    }
  }
  // cloth is lit only by the (smoothed) shape, not the skin texture, so nothing shows through
  float shade = 1.0;
  float top = (vArm > -0.6 && vArm < uTopLen && (vArm > -0.1 || vRest.y > uWaist - 0.02)) ? 1.0 : 0.0;
  float bot = (vLeg > -0.6 && vLeg < uBotLen && (vLeg > -0.1 || vRest.y < uWaist + 0.02)) ? 1.0 : 0.0;
  float shoe = vLeg > 1.0 + uShoeLen ? 1.0 : 0.0;
  if (vHead > 0.5) { top = 0.0; bot = 0.0; shoe = 0.0; }
  if (shoe > 0.5) { diffuseColor.rgb = pattern(uShoePat, uShoeC1, uShoeC2, vRest, 2.0) * shade; clothAmt = 1.0; }
  else if (top > 0.5 && (bot < 0.5 || vRest.y > uWaist - 0.01)) { diffuseColor.rgb = pattern(uTopPat, uTopC1, uTopC2, vRest, 0.0) * shade; clothAmt = 1.0; }
  else if (bot > 0.5) { diffuseColor.rgb = pattern(uBotPat, uBotC1, uBotC2, vRest, 1.0) * shade; clothAmt = 1.0; }
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
normal = normalize(mix(normal, nonPerturbedNormal, max(clothAmt, skinFlat)));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.95, clothAmt);`,
      );
  };
  return mat;
}

/** Writes a Look and skin tone into a body material's uniforms. */
export function applyLookUniforms(mat: THREE.Material, look: Look, skin: string, freckles: boolean) {
  const u = mat.userData.look as LookUniforms;
  u.uSkin.value.set(skin);
  u.uFreckles.value = freckles ? 1 : 0;
  const set = (prefix: string, id: string, c1: string, c2: string) => {
    const item = CLOTHING_BY_ID.get(id);
    if (!item) return;
    u[`u${prefix}C1`].value.set(c1);
    u[`u${prefix}C2`].value.set(c2);
    u[`u${prefix}Pat`].value = PATTERNS[item.pattern];
    u[`u${prefix}Infl`].value = item.inflate ?? 0.004;
  };
  set('Top', look.top.id, look.top.color, look.top.color2);
  set('Bot', look.bottom.id, look.bottom.color, look.bottom.color2);
  set('Shoe', look.shoes.id, look.shoes.color, look.shoes.color2);
  const top = CLOTHING_BY_ID.get(look.top.id);
  const bot = CLOTHING_BY_ID.get(look.bottom.id);
  const shoe = CLOTHING_BY_ID.get(look.shoes.id);
  u.uTopLen.value = Math.max(-0.2, Number(top?.shape ?? 0.45));
  const isSkirt = bot?.category === 'skirts';
  u.uSkirt.value = isSkirt ? 1 : 0;
  u.uBotLen.value = isSkirt ? 0.22 : Number(bot?.shape ?? 1.9);
  u.uShoeLen.value = Number(shoe?.shape ?? 0.9);
}

/** Tints the iris of the eye texture. */
export function makeEyeMaterial(src: THREE.MeshStandardMaterial) {
  const mat = new THREE.MeshStandardMaterial({ map: src.map, roughness: 0.3 });
  const uniforms = { uEye: { value: new THREE.Color('#4b2e17') } };
  mat.userData.eye = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uEye;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
{
  float r = length(vMapUv - vec2(0.5));
  float l = dot(diffuseColor.rgb, vec3(0.33));
  if (r < 0.1 && l < 0.3) diffuseColor.rgb = mix(diffuseColor.rgb, uEye * (0.4 + l * 3.0), smoothstep(0.035, 0.05, r));
}`,
      );
  };
  return mat;
}
