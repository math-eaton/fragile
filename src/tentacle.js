import * as THREE from 'three';
import { noiseVec3 } from './noise.js';

const RADIAL_SEGS = 5;

export class TentacleChain {
  constructor(segCount, restLen, options = {}) {
    this.segCount    = segCount;
    this.restLen     = restLen;
    this.legIndex    = options.legIndex    ?? 0;
    this._creatureOff = options.creatureOff ?? 0; 

    this.nodes = Array.from({ length: segCount }, (_, i) => ({
      pos:  new THREE.Vector3(0, -i * restLen, 0),
      prev: new THREE.Vector3(0, -i * restLen, 0),
    }));

    const tubularSegs  = segCount - 1;
    const vertsPerRing = RADIAL_SEGS + 1;  
    const numVerts     = segCount * vertsPerRing;

    this._tubularSegs = tubularSegs;
    this._posArr      = new Float32Array(numVerts * 3);
    this._normArr     = new Float32Array(numVerts * 3);

    const indices = [];
    for (let i = 0; i < tubularSegs; i++) {
      for (let j = 0; j < RADIAL_SEGS; j++) {
        const a = i * vertsPerRing + j;
        const b = a + 1;
        const c = (i + 1) * vertsPerRing + j;
        const d = c + 1;
        indices.push(a, b, d,  a, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this._posArr,  3));
    geo.setAttribute('normal',   new THREE.BufferAttribute(this._normArr, 3));
    geo.setIndex(indices);

    this.mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      color:     0xb8b4ae,
      shininess: options.shininess ?? 90,
      side:      THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
  }

  _updateTubeGeometry(cfg) {
    const baseR = cfg.TUBE_BASE_R;
    const tipR  = cfg.TUBE_TIP_R;

    const points = this.nodes.map(n => n.pos);
    const curve  = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    let frames, pts;
    try {
      frames = curve.computeFrenetFrames(this._tubularSegs, false);
      pts    = curve.getPoints(this._tubularSegs);
    } catch (e) { return; }
    if (isNaN(frames.normals[0].x)) return;   // degenerate — skip frame

    const R            = RADIAL_SEGS;
    const vertsPerRing = R + 1;
    let   vi           = 0;

    for (let i = 0; i < this.segCount; i++) {
      const t      = i / (this.segCount - 1);
      const radius = baseR * (1 - t) + tipR * t;
      const pt     = pts[i];
      const nm     = frames.normals[i];
      const bn     = frames.binormals[i];

      for (let j = 0; j <= R; j++) {
        const a   = (j / R) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);
        const nx  = cos * nm.x + sin * bn.x;
        const ny  = cos * nm.y + sin * bn.y;
        const nz  = cos * nm.z + sin * bn.z;

        this._posArr[vi    ] = pt.x + radius * nx;
        this._posArr[vi + 1] = pt.y + radius * ny;
        this._posArr[vi + 2] = pt.z + radius * nz;
        this._normArr[vi    ] = nx;
        this._normArr[vi + 1] = ny;
        this._normArr[vi + 2] = nz;
        vi += 3;
      }
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate   = true;
  }

  update(rootPos, t, cfg) {
    const { GRAVITY: gravity, DRAG: drag, NOISE_AMP: noiseAmp,
            NOISE_SPEED: noiseSpd, NOISE_SEED: noiseSeed,
            CONSTRAINT_ITERS: iters } = cfg;

    const root = this.nodes[0];
    root.prev.copy(root.pos);
    root.pos.copy(rootPos);

    const legOff = this.legIndex * 7.3 + this._creatureOff;
    for (let i = 1; i < this.segCount; i++) {
      const node = this.nodes[i];
      const vx = (node.pos.x - node.prev.x) * drag;
      const vy = (node.pos.y - node.prev.y) * drag;
      const vz = (node.pos.z - node.prev.z) * drag;
      const n = noiseVec3(
        node.pos.x * 0.5 + legOff,
        node.pos.y * 0.5 + t * noiseSpd + noiseSeed,
        node.pos.z * 0.5 + i * 0.4,
        t * noiseSpd
      );
      node.prev.copy(node.pos);
      node.pos.x += vx + n.x * noiseAmp;
      node.pos.y += vy + n.y * noiseAmp - gravity;
      node.pos.z += vz + n.z * noiseAmp;
    }

    for (let iter = 0; iter < iters; iter++) {
      for (let i = 0; i < this.segCount - 1; i++) {
        const a = this.nodes[i], b = this.nodes[i + 1];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const corr = (dist - this.restLen) / dist * 0.5;
        if (i === 0) {
          b.pos.x -= dx * corr * 2; b.pos.y -= dy * corr * 2; b.pos.z -= dz * corr * 2;
        } else {
          a.pos.x += dx * corr; a.pos.y += dy * corr; a.pos.z += dz * corr;
          b.pos.x -= dx * corr; b.pos.y -= dy * corr; b.pos.z -= dz * corr;
        }
      }
    }

    this._updateTubeGeometry(cfg);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
