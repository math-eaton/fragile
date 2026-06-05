import * as THREE from 'three';
import { TentacleChain } from './tentacle.js';
import { fbm } from './noise.js';

export class Spider {
  constructor(scene, cfg, spiderIndex) {
    this._scene    = scene;
    this._cfg      = cfg;
    this._idx      = spiderIndex;
    this._driftOff = spiderIndex * 13.7;

    this._physOff  = { GRAVITY: 0, DRAG: 0, NOISE_AMP: 0, NOISE_SPEED: 0 };
    this._physSeed = cfg.NOISE_SEED + spiderIndex * 17.3;

    const s = cfg.SPAWN_SPREAD;
    this.headPos = new THREE.Vector3(
      (Math.random() - 0.5) * s,
      (Math.random() - 0.5) * s * 0.75,
      (Math.random() - 0.5) * s * 0.375
    );

    this.tentacles = [];
    this._buildTentacles();
  }

  _buildTentacles() {
    for (const t of this.tentacles) {
      this._scene.remove(t.mesh);
      t.dispose();
    }
    this.tentacles = [];

    const { LEG_COUNT, SEG_COUNT, SEG_REST_LEN } = this._cfg;

    for (let i = 0; i < LEG_COUNT; i++) {
      const chain = new TentacleChain(SEG_COUNT, SEG_REST_LEN, {
        legIndex:    i,
        creatureOff: this._idx * 53.17,
        shininess:   this._cfg.SHININESS,
      });

      const angle = (i / LEG_COUNT) * Math.PI * 2;
      const tiltZ = (Math.random() - 0.5) * 0.9;
      for (let j = 0; j < SEG_COUNT; j++) {
        const r = j * SEG_REST_LEN;
        chain.nodes[j].pos.set(
          this.headPos.x + Math.cos(angle) * r,
          this.headPos.y + Math.sin(angle) * r - j * 0.06,
          this.headPos.z + tiltZ * j * 0.12
        );
        chain.nodes[j].prev.copy(chain.nodes[j].pos);
      }

      this._scene.add(chain.mesh);
      this.tentacles.push(chain);
    }
  }

  randomizePhysics() {
    const jit = v => (Math.random() - 0.5) * v * 0.8;
    this._physOff.GRAVITY     = jit(this._cfg.GRAVITY);
    this._physOff.DRAG        = (Math.random() - 0.5) * 0.025;
    this._physOff.NOISE_AMP   = jit(this._cfg.NOISE_AMP);
    this._physOff.NOISE_SPEED = jit(this._cfg.NOISE_SPEED);
    this._physSeed = Math.random() * 100;
  }

  rebuild() {
    this._buildTentacles();
  }

  update(t) {
    const { HEAD_DRIFT_AMP: amp, HEAD_DRIFT_SPD: spd } = this._cfg;
    const o = this._driftOff;

    this.headPos.x += (fbm(t * spd + o,         this._physSeed      ) - 0.5) * amp * 2;
    this.headPos.y += (fbm(t * spd + o + 41.2,   this._physSeed + 5.2) - 0.5) * amp * 2;
    this.headPos.z += (fbm(t * spd * 0.3 + o,    this._physSeed + 3.1) - 0.5) * amp * 0.6;

    this.headPos.x -= this.headPos.x * 0.00025;
    this.headPos.y -= this.headPos.y * 0.00025;

    const o2 = this._physOff;
    const simCfg = {
      ...this._cfg,
      GRAVITY:     Math.max(0,     this._cfg.GRAVITY    + o2.GRAVITY),
      DRAG:        Math.min(0.999, Math.max(0.9, this._cfg.DRAG + o2.DRAG)),
      NOISE_AMP:   Math.max(0,     this._cfg.NOISE_AMP  + o2.NOISE_AMP),
      NOISE_SPEED: Math.max(0,     this._cfg.NOISE_SPEED + o2.NOISE_SPEED),
      NOISE_SEED:  this._physSeed,
    };
    for (const chain of this.tentacles) {
      chain.update(this.headPos, t, simCfg);
    }
  }

  dispose() {
    for (const t of this.tentacles) {
      this._scene.remove(t.mesh);
      t.dispose();
    }
  }
}
