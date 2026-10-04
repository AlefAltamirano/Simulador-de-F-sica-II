import * as THREE from 'three';

/**
 * Unit 1: Electrostática (Cargas, Campo Eléctrico 3D y Potencial)
 */
export class Unit1Electrostatics {
  constructor(scene, physicsEngine) {
    this.scene = scene;
    this.physics = physicsEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Estado de cargas puntuales
    this.charges = [];
    this.chargeMeshes = [];
    this.arrows = [];
    this.arrowGroup = new THREE.Group();
    this.group.add(this.arrowGroup);

    // Parámetros de visualización
    this.params = {
      gridSize: 7,          // 7x7 en el plano
      gridSpacing: 1.2,
      layers: 3,            // Capas en Z/Y
      planeMode: '3D-Volume', // '3D-Volume' o '2D-Plane'
      arrowScale: 0.8,
      probePoint: { x: 0, y: 1.5, z: 0 },
      preset: 'dipole'
    };

    // Materiales reutilizables
    this.posMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5
    });

    this.negMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5
    });

    this.sphereGeo = new THREE.SphereGeometry(0.35, 32, 32);

    // Inicializar con preset dipolo
    this.initPreset('dipole');
  }

  initPreset(name) {
    this.clearCharges();
    if (name === 'dipole') {
      this.addCharge(-2.0, 0, 0, 3.0);   // +3 uC
      this.addCharge(2.0, 0, 0, -3.0);   // -3 uC
    } else if (name === 'quadrupole') {
      this.addCharge(-2.0, 2.0, 0, 2.5);
      this.addCharge(2.0, 2.0, 0, -2.5);
      this.addCharge(-2.0, -2.0, 0, -2.5);
      this.addCharge(2.0, -2.0, 0, 2.5);
    } else if (name === 'single-positive') {
      this.addCharge(0, 0, 0, 4.0);
    } else if (name === 'like-charges') {
      this.addCharge(-2.0, 0, 0, 3.0);
      this.addCharge(2.0, 0, 0, 3.0);
    }
    this.rebuildFieldGrid();
  }

  addCharge(x, y, z, q) {
    const id = Date.now() + Math.random();
    const chargeData = { id, x, y, z, q };
    this.charges.push(chargeData);

    // Malla visual
    const mesh = new THREE.Mesh(this.sphereGeo, q > 0 ? this.posMaterial : this.negMaterial);
    mesh.position.set(x, y, z);
    mesh.userData = { chargeData };

    // Anillo exterior decorativo
    const ringGeo = new THREE.RingGeometry(0.42, 0.48, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: q > 0 ? 0xfca5a5 : 0x7dd3fc,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);

    this.group.add(mesh);
    this.chargeMeshes.push(mesh);
    this.rebuildFieldGrid();
    return chargeData;
  }

  removeLastCharge() {
    if (this.charges.length === 0) return;
    this.charges.pop();
    const mesh = this.chargeMeshes.pop();
    if (mesh) {
      this.group.remove(mesh);
      mesh.geometry?.dispose();
    }
    this.rebuildFieldGrid();
  }

  clearCharges() {
    for (const mesh of this.chargeMeshes) {
      this.group.remove(mesh);
    }
    this.charges = [];
    this.chargeMeshes = [];
    this.rebuildFieldGrid();
  }

  rebuildFieldGrid() {
    // Limpiar flechas anteriores
    while (this.arrowGroup.children.length > 0) {
      const obj = this.arrowGroup.children[0];
      this.arrowGroup.remove(obj);
      if (obj.dispose) obj.dispose();
    }
    this.arrows = [];

    if (this.charges.length === 0) return;

    const { gridSize, gridSpacing, layers, planeMode } = this.params;
    const halfGrid = Math.floor(gridSize / 2);
    const halfLayers = planeMode === '2D-Plane' ? 0 : Math.floor(layers / 2);

    for (let ix = -halfGrid; ix <= halfGrid; ix++) {
      for (let iy = -halfGrid; iy <= halfGrid; iy++) {
        for (let iz = -halfLayers; iz <= halfLayers; iz++) {
          const px = ix * gridSpacing;
          const py = iy * gridSpacing;
          const pz = iz * gridSpacing;

          // Verificar que el punto no esté superpuesto a una carga
          let tooClose = false;
          for (const c of this.charges) {
            const dx = px - c.x;
            const dy = py - c.y;
            const dz = pz - c.z;
            if (dx * dx + dy * dy + dz * dz < 0.35) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const point = { x: px, y: py, z: pz };
          const eField = this.physics.calculateElectricField(point, this.charges, false);

          if (eField.magnitude > 0.001) {
            const dir = new THREE.Vector3(eField.direction.x, eField.direction.y, eField.direction.z);
            const origin = new THREE.Vector3(px, py, pz);

            // Escalar longitud proporcional y acotada
            const length = Math.min(0.9, Math.max(0.2, Math.log10(eField.magnitude + 1) * 0.7 * this.params.arrowScale));

            // Color en función de la magnitud: azul/cian -> verde -> amarillo -> rojo
            const normMag = Math.min(1.0, eField.magnitude / 3.0);
            const color = new THREE.Color();
            color.setHSL((1.0 - normMag) * 0.65, 0.9, 0.55);

            const arrow = new THREE.ArrowHelper(dir, origin, length, color.getHex(), length * 0.35, length * 0.25);
            this.arrowGroup.add(arrow);
            this.arrows.push(arrow);
          }
        }
      }
    }
  }

  getTelemetry() {
    const probe = this.params.probePoint;
    const eField = this.physics.calculateElectricField(probe, this.charges, false);
    const potential = this.physics.calculateElectricPotential(probe, this.charges, false);

    // Escala real equivalente en SI (asumiendo uC y metros)
    const eFieldReal = this.physics.calculateElectricField(
      probe,
      this.charges.map(c => ({ ...c, q: c.q * 1e-6 })),
      true
    );
    const potentialReal = this.physics.calculateElectricPotential(
      probe,
      this.charges.map(c => ({ ...c, q: c.q * 1e-6 })),
      true
    );

    return {
      chargeCount: this.charges.length,
      netCharge: this.charges.reduce((acc, c) => acc + c.q, 0).toFixed(2) + ' μC',
      probePosition: `(${probe.x.toFixed(1)}, ${probe.y.toFixed(1)}, ${probe.z.toFixed(1)}) m`,
      electricField: `${eFieldReal.magnitude.toExponential(2)} N/C`,
      electricPotential: `${potentialReal.toExponential(2)} V`,
      fieldVector: `[${eField.vector.x.toFixed(2)}, ${eField.vector.y.toFixed(2)}, ${eField.vector.z.toFixed(2)}]`
    };
  }

  update(time, delta) {
    // Animación sutil de respiración en las cargas
    const scale = 1.0 + Math.sin(time * 3) * 0.04;
    for (const mesh of this.chargeMeshes) {
      mesh.scale.set(scale, scale, scale);
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    this.clearCharges();
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.scene.remove(this.group);
  }
}
