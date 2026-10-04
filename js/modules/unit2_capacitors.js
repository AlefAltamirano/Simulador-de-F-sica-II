import * as THREE from 'three';

/**
 * Unit 2: Condensadores (Placas Paralelas 3D, Dieléctrico y Energía Almacenada)
 */
export class Unit2Capacitors {
  constructor(scene, physicsEngine) {
    this.scene = scene;
    this.physics = physicsEngine;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Parámetros físicos del condensador
    this.params = {
      plateArea: 2.0,           // A en m² (ancho y profundidad ~ sqrt(A))
      distance: 1.5,            // d en m (separación entre placas)
      dielectricConstant: 1.0,  // kappa (1.0 = vacío/aire, 2.5 = plástico, 4.0 = vidrio, 8.0 = cerámica)
      voltage: 24.0,            // V en Voltios
      dielectricInsert: 1.0,    // 0 = fuera, 1 = completamente insertado
      showFringing: true        // Mostrar efecto de borde (líneas curvas)
    };

    // Grupos internos
    this.topPlate = null;
    this.bottomPlate = null;
    this.dielectricSlab = null;
    this.fieldLinesGroup = new THREE.Group();
    this.chargeSignsGroup = new THREE.Group();
    this.group.add(this.fieldLinesGroup);
    this.group.add(this.chargeSignsGroup);

    this.initMeshes();
    this.updatePlatesGeometry();
  }

  initMeshes() {
    // Material de placas conductoras (cobre / aluminio pulido)
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25
    });

    const plateThickness = 0.08;
    const initialSize = Math.sqrt(this.params.plateArea);
    const boxGeo = new THREE.BoxGeometry(initialSize, plateThickness, initialSize);

    // Placa superior (+)
    this.topPlate = new THREE.Mesh(boxGeo, plateMat.clone());
    this.topPlate.material.color.setHex(0xdc2626); // Tinte rojizo conductor positivo
    this.group.add(this.topPlate);

    // Placa inferior (-)
    this.bottomPlate = new THREE.Mesh(boxGeo, plateMat.clone());
    this.bottomPlate.material.color.setHex(0x2563eb); // Tinte azul conductor negativo
    this.group.add(this.bottomPlate);

    // Dieléctrico (bloque translúcido)
    const dielectricMat = new THREE.MeshPhysicalMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      transmission: 0.4,
      ior: 1.5
    });

    const dielectricGeo = new THREE.BoxGeometry(initialSize * 0.98, this.params.distance * 0.98, initialSize * 0.98);
    this.dielectricSlab = new THREE.Mesh(dielectricGeo, dielectricMat);
    this.group.add(this.dielectricSlab);

    // Postes de conexión eléctrica a los terminales
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    this.topPole = new THREE.Mesh(poleGeo, poleMat);
    this.bottomPole = new THREE.Mesh(poleGeo, poleMat);
    this.group.add(this.topPole);
    this.group.add(this.bottomPole);
  }

  updatePlatesGeometry() {
    const size = Math.sqrt(this.params.plateArea);
    const halfD = this.params.distance * 0.5;
    const plateThickness = 0.08;

    // Actualizar geometrías de las placas
    this.topPlate.geometry.dispose();
    this.topPlate.geometry = new THREE.BoxGeometry(size, plateThickness, size);
    this.topPlate.position.set(0, halfD, 0);

    this.bottomPlate.geometry.dispose();
    this.bottomPlate.geometry = new THREE.BoxGeometry(size, plateThickness, size);
    this.bottomPlate.position.set(0, -halfD, 0);

    // Actualizar dieléctrico
    const dHeight = Math.max(0.01, this.params.distance - plateThickness);
    this.dielectricSlab.geometry.dispose();
    this.dielectricSlab.geometry = new THREE.BoxGeometry(size * 0.96, dHeight, size * 0.96);

    // Posición del dieléctrico (puede deslizarse dentro o fuera)
    const xOffset = (1.0 - this.params.dielectricInsert) * (size * 1.2);
    this.dielectricSlab.position.set(xOffset, 0, 0);

    // Color del dieléctrico según la constante kappa
    const kappa = this.params.dielectricConstant;
    const slabMat = this.dielectricSlab.material;
    if (kappa <= 1.05) {
      slabMat.opacity = 0.08; // casi aire/vacío
      slabMat.color.setHex(0xe0f2fe);
    } else {
      slabMat.opacity = Math.min(0.75, 0.25 + kappa * 0.06);
      slabMat.color.setHex(kappa > 5 ? 0xec4899 : 0x8b5cf6);
    }

    // Terminales / Postes
    this.topPole.position.set(0, halfD + 0.6, 0);
    this.bottomPole.position.set(0, -halfD - 0.6, 0);

    this.rebuildFieldLines();
  }

  rebuildFieldLines() {
    while (this.fieldLinesGroup.children.length > 0) {
      const obj = this.fieldLinesGroup.children[0];
      this.fieldLinesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }

    const size = Math.sqrt(this.params.plateArea);
    const halfD = this.params.distance * 0.5;
    const density = Math.max(3, Math.min(6, Math.floor(size * 2.5)));
    const step = size / (density + 1);

    // Vector de campo de placa positiva (arriba) a placa negativa (abajo)
    const dir = new THREE.Vector3(0, -1, 0);
    const len = Math.max(0.1, this.params.distance - 0.12);

    const E = this.physics.calculateCapacitorField(this.params.voltage, this.params.distance);
    const arrowColor = 0x38bdf8;

    // Líneas uniformes internas
    for (let i = 1; i <= density; i++) {
      for (let j = 1; j <= density; j++) {
        const px = -size * 0.5 + i * step;
        const pz = -size * 0.5 + j * step;
        const origin = new THREE.Vector3(px, halfD - 0.06, pz);

        const arrow = new THREE.ArrowHelper(dir, origin, len, arrowColor, 0.15, 0.08);
        this.fieldLinesGroup.add(arrow);
      }
    }

    // Líneas de borde curvadas (Fringing Field Effect)
    if (this.params.showFringing) {
      const edgePoints = [
        { x: size * 0.5, z: 0 },
        { x: -size * 0.5, z: 0 },
        { x: 0, z: size * 0.5 },
        { x: 0, z: -size * 0.5 }
      ];

      for (const ep of edgePoints) {
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(ep.x * 1.05, halfD, ep.z * 1.05),
          new THREE.Vector3(ep.x * 1.4, halfD * 0.7, ep.z * 1.4),
          new THREE.Vector3(ep.x * 1.4, -halfD * 0.7, ep.z * 1.4),
          new THREE.Vector3(ep.x * 1.05, -halfD, ep.z * 1.05)
        );
        const pts = curve.getPoints(16);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: 0x93c5fd,
          dashSize: 0.1,
          gapSize: 0.05,
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        this.fieldLinesGroup.add(line);
      }
    }
  }

  getTelemetry() {
    const { plateArea, distance, dielectricConstant, voltage } = this.params;
    const C = this.physics.calculateCapacitance(plateArea, distance, dielectricConstant);
    const U = this.physics.calculateCapacitorEnergy(C, voltage);
    const Q = this.physics.calculateCapacitorCharge(C, voltage);
    const E = this.physics.calculateCapacitorField(voltage, distance);

    return {
      capacitance: `${(C * 1e12).toFixed(2)} pF`,
      energy: `${(U * 1e9).toFixed(3)} nJ`,
      charge: `${(Q * 1e12).toFixed(2)} pC`,
      electricField: `${E.toFixed(1)} V/m`,
      plateArea: `${plateArea.toFixed(2)} m²`,
      separation: `${distance.toFixed(2)} m`,
      dielectric: `κ = ${dielectricConstant.toFixed(2)}`,
      voltage: `${voltage.toFixed(1)} V`
    };
  }

  update(time, delta) {
    // Pulsación suave de las líneas de campo
    const pulse = 1.0 + Math.sin(time * 4) * 0.03;
    this.fieldLinesGroup.scale.set(1, pulse, 1);
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
