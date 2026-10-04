import * as THREE from 'three';

/**
 * Unit 4: Campo Magnético y Fuerza de Lorentz (Trayectoria con Integrador RK4)
 * F = q * ( E + v x B )
 */
export class Unit4Magnetism {
  constructor(scene, physicsEngine) {
    this.scene = scene;
    this.physics = physicsEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Parámetros físicos del sistema
    this.params = {
      // Campo Magnético B (Tesla)
      Bx: 0.0,
      By: 0.0,
      Bz: 1.5,
      // Campo Eléctrico E (V/m o N/C)
      Ex: 0.0,
      Ey: 0.0,
      Ez: 0.0,
      // Partícula de prueba
      charge: 1.0,         // +1 e (o normalizado)
      mass: 1.0,           // 1 m
      vx: 3.5,             // Velocidad inicial
      vy: 0.0,
      vz: 0.8,
      // Simulación
      timeStep: 0.015,
      maxTrailPoints: 1200,
      preset: 'helical',
      isPaused: false
    };

    // Estado dinámico de la partícula actual
    this.particle = {
      position: { x: 0, y: -1.5, z: 0 },
      velocity: { x: this.params.vx, y: this.params.vy, z: this.params.vz },
      q: this.params.charge,
      mass: this.params.mass
    };

    // Elementos gráficos
    this.fieldArrowsGroup = new THREE.Group();
    this.trajectoryGroup = new THREE.Group();
    this.vectorHelpersGroup = new THREE.Group();
    this.group.add(this.fieldArrowsGroup);
    this.group.add(this.trajectoryGroup);
    this.group.add(this.vectorHelpersGroup);

    // Partícula 3D
    const pGeo = new THREE.SphereGeometry(0.18, 32, 32);
    this.pMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    this.particleMesh = new THREE.Mesh(pGeo, this.pMat);
    this.group.add(this.particleMesh);

    // Trazador de línea de trayectoria
    this.trailPoints = [];
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    this.trailLine = new THREE.Line(lineGeo, lineMat);
    this.trajectoryGroup.add(this.trailLine);

    // Vectores indicadores sobre la partícula
    this.velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1, 0x38bdf8, 0.2, 0.1);
    this.magForceArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xa855f7, 0.2, 0.1);
    this.netForceArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1, 0xef4444, 0.25, 0.12);
    this.vectorHelpersGroup.add(this.velArrow);
    this.vectorHelpersGroup.add(this.magForceArrow);
    this.vectorHelpersGroup.add(this.netForceArrow);

    // Bobinas de Helmholtz / Polos magnéticos decorativos
    this.initCoilVisuals();

    // Inicializar preset
    this.applyPreset('helical');
  }

  initCoilVisuals() {
    // Anillos que representan bobinas generadoras de campo B
    const coilGeo = new THREE.TorusGeometry(3.0, 0.08, 16, 64);
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8, roughness: 0.2 });

    const coilTop = new THREE.Mesh(coilGeo, coilMat);
    coilTop.position.set(0, 0, 1.8);
    const coilBottom = new THREE.Mesh(coilGeo, coilMat);
    coilBottom.position.set(0, 0, -1.8);

    this.group.add(coilTop);
    this.group.add(coilBottom);
  }

  applyPreset(name) {
    this.params.preset = name;
    if (name === 'cyclotron') {
      // Giro puramente circular en el plano XY (B en Z, v perpendicular)
      this.params.Bx = 0; this.params.By = 0; this.params.Bz = 2.0;
      this.params.Ex = 0; this.params.Ey = 0; this.params.Ez = 0;
      this.params.vx = 3.5; this.params.vy = 0; this.params.vz = 0;
      this.resetParticle(0, -1.75, 0);
    } else if (name === 'helical') {
      // Hélice 3D (B en Z, componente vz != 0)
      this.params.Bx = 0; this.params.By = 0; this.params.Bz = 1.8;
      this.params.Ex = 0; this.params.Ey = 0; this.params.Ez = 0;
      this.params.vx = 3.2; this.params.vy = 0; this.params.vz = 0.9;
      this.resetParticle(0, -1.7, -3.0);
    } else if (name === 'velocity_selector') {
      // Selector de velocidad: E en Y, B en Z, v en X tal que E = v * B
      const v = 3.0;
      const B = 1.5;
      const E = v * B; // Fe = qE, Fb = q(v x B) = -qvB => Fe + Fb = 0
      this.params.Bx = 0; this.params.By = 0; this.params.Bz = B;
      this.params.Ex = 0; this.params.Ey = -E; this.params.Ez = 0;
      this.params.vx = v; this.params.vy = 0; this.params.vz = 0;
      this.resetParticle(-4.0, 0, 0);
    } else if (name === 'drift_ExB') {
      // Deriva E x B (Cicloide con deriva neta perpendicular a E y B)
      this.params.Bx = 0; this.params.By = 0; this.params.Bz = 2.0;
      this.params.Ex = 0; this.params.Ey = 1.2; this.params.Ez = 0;
      this.params.vx = 1.0; this.params.vy = 0; this.params.vz = 0;
      this.resetParticle(-3.5, 0, 0);
    }
    this.rebuildFieldVectors();
  }

  resetParticle(x = 0, y = 0, z = 0) {
    this.particle = {
      position: { x, y, z },
      velocity: { x: this.params.vx, y: this.params.vy, z: this.params.vz },
      q: this.params.charge,
      mass: this.params.mass
    };

    // Actualizar color según signo de la carga
    if (this.particle.q >= 0) {
      this.pMat.color.setHex(0xef4444);
      this.pMat.emissive.setHex(0xb91c1c);
    } else {
      this.pMat.color.setHex(0x38bdf8);
      this.pMat.emissive.setHex(0x0284c7);
    }

    this.trailPoints = [new THREE.Vector3(x, y, z)];
    this.updateTrailLine();
  }

  rebuildFieldVectors() {
    while (this.fieldArrowsGroup.children.length > 0) {
      const obj = this.fieldArrowsGroup.children[0];
      this.fieldArrowsGroup.remove(obj);
      if (obj.dispose) obj.dispose();
    }

    // Grid de flechas del Campo B (Verde Esmeralda)
    const B = new THREE.Vector3(this.params.Bx, this.params.By, this.params.Bz);
    const Bmag = B.length();

    if (Bmag > 0.05) {
      const Bdir = B.clone().normalize();
      const step = 2.0;
      for (let x = -3; x <= 3; x += step) {
        for (let y = -3; y <= 3; y += step) {
          const origin = new THREE.Vector3(x, y, 0);
          const len = Math.min(1.2, Math.max(0.3, Bmag * 0.4));
          const arrow = new THREE.ArrowHelper(Bdir, origin, len, 0x10b981, len * 0.35, len * 0.2);
          this.fieldArrowsGroup.add(arrow);
        }
      }
    }

    // Grid de flechas del Campo E (Naranja / Ámbar)
    const E = new THREE.Vector3(this.params.Ex, this.params.Ey, this.params.Ez);
    const Emag = E.length();

    if (Emag > 0.05) {
      const Edir = E.clone().normalize();
      const step = 2.0;
      for (let x = -3; x <= 3; x += step) {
        for (let y = -3; y <= 3; y += step) {
          const origin = new THREE.Vector3(x, y, 0.4);
          const len = Math.min(1.2, Math.max(0.3, Emag * 0.35));
          const arrow = new THREE.ArrowHelper(Edir, origin, len, 0xf59e0b, len * 0.35, len * 0.2);
          this.fieldArrowsGroup.add(arrow);
        }
      }
    }
  }

  updateTrailLine() {
    this.trailLine.geometry.dispose();
    this.trailLine.geometry = new THREE.BufferGeometry().setFromPoints(this.trailPoints);
  }

  getTelemetry() {
    const { position: p, velocity: v, q, mass } = this.particle;
    const E = { x: this.params.Ex, y: this.params.Ey, z: this.params.Ez };
    const B = { x: this.params.Bx, y: this.params.By, z: this.params.Bz };
    const force = this.physics.calculateLorentzForce(q, v, E, B);

    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const Bmag = Math.sqrt(B.x * B.x + B.y * B.y + B.z * B.z);
    const vPerp = Math.sqrt(v.x * v.x + v.y * v.y);
    const rCyclotron = this.physics.calculateCyclotronRadius(mass, vPerp, q, Bmag);

    return {
      particlePos: `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) m`,
      velocity: `${speed.toFixed(2)} m/s`,
      magneticFieldB: `[${B.x.toFixed(1)}, ${B.y.toFixed(1)}, ${B.z.toFixed(1)}] T`,
      electricFieldE: `[${E.x.toFixed(1)}, ${E.y.toFixed(1)}, ${E.z.toFixed(1)}] V/m`,
      lorentzForce: `[${force.x.toFixed(2)}, ${force.y.toFixed(2)}, ${force.z.toFixed(2)}] N`,
      cyclotronRadius: isFinite(rCyclotron) ? `${rCyclotron.toFixed(2)} m` : 'Infinito (Sin giro puro)'
    };
  }

  update(time, delta) {
    if (this.params.isPaused) return;

    const E = { x: this.params.Ex, y: this.params.Ey, z: this.params.Ez };
    const B = { x: this.params.Bx, y: this.params.By, z: this.params.Bz };

    // Sub-pasos de integración para máxima suavidad y fidelidad numérica
    const subSteps = 3;
    const subDt = this.params.timeStep / subSteps;

    for (let s = 0; s < subSteps; s++) {
      const next = this.physics.integrateRK4(this.particle, subDt, E, B);
      this.particle.position = next.position;
      this.particle.velocity = next.velocity;
    }

    const { x, y, z } = this.particle.position;
    this.particleMesh.position.set(x, y, z);

    // Añadir punto al rastro
    this.trailPoints.push(new THREE.Vector3(x, y, z));
    if (this.trailPoints.length > this.params.maxTrailPoints) {
      this.trailPoints.shift();
    }
    this.updateTrailLine();

    // Actualizar flechas de vectores sobre la partícula
    const pVec = new THREE.Vector3(x, y, z);
    const v = this.particle.velocity;
    const vVec = new THREE.Vector3(v.x, v.y, v.z);
    const speed = vVec.length();

    if (speed > 0.01) {
      this.velArrow.position.copy(pVec);
      this.velArrow.setDirection(vVec.clone().normalize());
      this.velArrow.setLength(Math.min(1.5, speed * 0.35), 0.25, 0.12);
    }

    // Fuerza de Lorentz instantánea
    const F = this.physics.calculateLorentzForce(this.particle.q, v, E, B);
    const fVec = new THREE.Vector3(F.x, F.y, F.z);
    const fMag = fVec.length();

    if (fMag > 0.01) {
      this.netForceArrow.position.copy(pVec);
      this.netForceArrow.setDirection(fVec.clone().normalize());
      this.netForceArrow.setLength(Math.min(1.8, fMag * 0.35), 0.25, 0.12);
      this.netForceArrow.visible = true;
    } else {
      this.netForceArrow.visible = false;
    }

    // Si la partícula se aleja demasiado del laboratorio 3D, relanzarla automáticamente
    const distFromOrigin = Math.sqrt(x * x + y * y + z * z);
    if (distFromOrigin > 18.0) {
      this.applyPreset(this.params.preset);
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    while (this.group.children.length > 0) {
      const obj = this.group.children[0];
      this.group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.scene.remove(this.group);
  }
}
