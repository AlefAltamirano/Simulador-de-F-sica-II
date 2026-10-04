import * as THREE from 'three';

/**
 * Unit 3: Circuitos Eléctricos y Ley de Ohm (Malla 3D y Flujo de Electrones)
 */
export class Unit3Circuits {
  constructor(scene, physicsEngine) {
    this.scene = scene;
    this.physics = physicsEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Parámetros eléctricos
    this.params = {
      voltage: 12.0,       // V en Voltios
      resistance: 10.0,    // R en Ohmios (Ω)
      switchClosed: true,  // Interruptor cerrado (permite corriente)
      electronCount: 60,   // Cantidad de electrones visibles
      showThermalGlow: true
    };

    // Dimensiones de la malla rectangular
    this.circuitWidth = 6.0;
    this.circuitHeight = 3.6;

    // Componentes visuales
    this.resistorMesh = null;
    this.resistorGlow = null;
    this.batteryMesh = null;
    this.switchBlade = null;
    this.electronMeshGroup = new THREE.Group();
    this.group.add(this.electronMeshGroup);

    // Electrones con posiciones paramétricas en el bucle [0, 1]
    this.electronProgress = [];

    this.initCircuitComponents();
    this.initElectrons();
  }

  initCircuitComponents() {
    // 1. Cables conductores (Tubería de cobre con codos suaves)
    const curvePoints = [
      new THREE.Vector3(-this.circuitWidth / 2, -this.circuitHeight / 2, 0),
      new THREE.Vector3(this.circuitWidth / 2, -this.circuitHeight / 2, 0),
      new THREE.Vector3(this.circuitWidth / 2, this.circuitHeight / 2, 0),
      new THREE.Vector3(-this.circuitWidth / 2, this.circuitHeight / 2, 0),
      new THREE.Vector3(-this.circuitWidth / 2, -this.circuitHeight / 2, 0)
    ];

    const wireCurve = new THREE.CatmullRomCurve3(curvePoints, true, 'catmullrom', 0.1);
    this.wireCurve = wireCurve;

    const tubeGeo = new THREE.TubeGeometry(wireCurve, 120, 0.06, 12, true);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.3
    });
    const wireMesh = new THREE.Mesh(tubeGeo, wireMat);
    this.group.add(wireMesh);

    // 2. Fuente de Voltaje (Batería DC en el ramal inferior)
    const batteryGroup = new THREE.Group();
    batteryGroup.position.set(0, -this.circuitHeight / 2, 0);

    const battBodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.2, 32);
    battBodyGeo.rotateZ(Math.PI / 2);
    const battBodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const battBody = new THREE.Mesh(battBodyGeo, battBodyMat);
    batteryGroup.add(battBody);

    // Terminal positivo (Dorado / Rojo)
    const termPosGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.25, 24);
    termPosGeo.rotateZ(Math.PI / 2);
    const termPosMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.2 });
    const termPos = new THREE.Mesh(termPosGeo, termPosMat);
    termPos.position.set(0.68, 0, 0);
    batteryGroup.add(termPos);

    // Terminal negativo (Azul / Plata)
    const termNegGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 24);
    termNegGeo.rotateZ(Math.PI / 2);
    const termNegMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.2 });
    const termNeg = new THREE.Mesh(termNegGeo, termNegMat);
    termNeg.position.set(-0.62, 0, 0);
    batteryGroup.add(termNeg);

    this.batteryMesh = batteryGroup;
    this.group.add(batteryGroup);

    // 3. Resistor en el ramal superior
    const resistorGroup = new THREE.Group();
    resistorGroup.position.set(0, this.circuitHeight / 2, 0);

    // Cuerpo cerámico del resistor
    const resBodyGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.4, 32);
    resBodyGeo.rotateZ(Math.PI / 2);
    const resBodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    this.resistorMesh = new THREE.Mesh(resBodyGeo, resBodyMat);
    resistorGroup.add(this.resistorMesh);

    // Bandas de código de color del resistor
    const bandPositions = [-0.4, -0.15, 0.1, 0.4];
    const bandColors = [0x78350f, 0x000000, 0xd97706, 0xf59e0b];
    this.bandMeshes = [];

    for (let i = 0; i < bandPositions.length; i++) {
      const bandGeo = new THREE.CylinderGeometry(0.226, 0.226, 0.08, 32);
      bandGeo.rotateZ(Math.PI / 2);
      const bandMat = new THREE.MeshStandardMaterial({ color: bandColors[i], roughness: 0.3 });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.set(bandPositions[i], 0, 0);
      resistorGroup.add(bandMesh);
      this.bandMeshes.push(bandMesh);
    }

    // Brillo térmico del resistor (Efecto Joule P = I²R)
    const glowGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 24);
    glowGeo.rotateZ(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.0
    });
    this.resistorGlow = new THREE.Mesh(glowGeo, glowMat);
    resistorGroup.add(this.resistorGlow);

    this.group.add(resistorGroup);

    // 4. Interruptor en el ramal lateral derecho
    const switchGroup = new THREE.Group();
    switchGroup.position.set(this.circuitWidth / 2, 0, 0);

    const contactGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const contactMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 });
    const contactA = new THREE.Mesh(contactGeo, contactMat);
    contactA.position.set(0, -0.4, 0);
    const contactB = new THREE.Mesh(contactGeo, contactMat);
    contactB.position.set(0, 0.4, 0);
    switchGroup.add(contactA);
    switchGroup.add(contactB);

    // Cuchilla del interruptor (pivotable)
    const bladeGeo = new THREE.BoxGeometry(0.08, 0.8, 0.05);
    bladeGeo.translate(0, 0.38, 0);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 });
    this.switchBlade = new THREE.Mesh(bladeGeo, bladeMat);
    this.switchBlade.position.set(0, -0.4, 0);
    switchGroup.add(this.switchBlade);

    this.group.add(switchGroup);
    this.updateSwitchVisual();
  }

  initElectrons() {
    const electronGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const electronMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    const count = this.params.electronCount;
    this.electronMeshes = [];
    this.electronProgress = [];

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(electronGeo, electronMat);
      this.electronMeshGroup.add(mesh);
      this.electronMeshes.push(mesh);
      this.electronProgress.push(i / count);
    }
  }

  setSwitch(closed) {
    this.params.switchClosed = closed;
    this.updateSwitchVisual();
  }

  updateSwitchVisual() {
    if (this.switchBlade) {
      // 0 rad si está cerrado, 0.65 rad si está abierto
      this.switchBlade.rotation.z = this.params.switchClosed ? 0 : -0.65;
    }
  }

  getTelemetry() {
    const { voltage, resistance, switchClosed } = this.params;
    const current = switchClosed ? this.physics.calculateCurrent(voltage, resistance) : 0;
    const power = this.physics.calculatePower(voltage, current);

    return {
      voltage: `${voltage.toFixed(2)} V`,
      resistance: `${resistance.toFixed(1)} Ω`,
      current: `${current.toFixed(3)} A (${(current * 1000).toFixed(1)} mA)`,
      power: `${power.toFixed(3)} W`,
      state: switchClosed ? 'Circuito Cerrado (ON)' : 'Circuito Abierto (OFF)',
      driftSpeed: switchClosed ? `${(current * 1.5).toFixed(2)} u/s` : '0 u/s (Jitter térmico)'
    };
  }

  update(time, delta) {
    const { voltage, resistance, switchClosed } = this.params;
    const current = switchClosed ? this.physics.calculateCurrent(voltage, resistance) : 0;
    const power = this.physics.calculatePower(voltage, current);

    // 1. Actualizar brillo térmico del resistor según disipación P
    if (this.resistorGlow) {
      const targetOpacity = switchClosed ? Math.min(0.85, (power / 50.0) * 0.7) : 0;
      this.resistorGlow.material.opacity = targetOpacity;
    }

    // 2. Mover electrones en la curva de la malla
    // Sentido real de los electrones: de polo negativo (-) a polo positivo (+)
    const speed = switchClosed ? current * 0.18 : 0;

    for (let i = 0; i < this.electronMeshes.length; i++) {
      if (switchClosed) {
        this.electronProgress[i] = (this.electronProgress[i] + speed * delta) % 1.0;
      } else {
        // Pequeño movimiento térmico browniano cuando el circuito está abierto
        this.electronProgress[i] = (this.electronProgress[i] + Math.sin(time * 5 + i) * 0.0002 + 1.0) % 1.0;
      }

      const point = this.wireCurve.getPointAt(this.electronProgress[i]);
      this.electronMeshes[i].position.copy(point);
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
