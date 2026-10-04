import GUI from 'lil-gui';

/**
 * GUI Controls Manager usando lil-gui
 * Proporciona sliders interactivos y selectores en tiempo real para cada módulo de Física II
 */
export class GuiControls {
  constructor(containerElement) {
    this.container = containerElement;
    this.gui = null;
  }

  init() {
    if (this.gui) {
      this.gui.destroy();
    }

    this.gui = new GUI({
      container: this.container,
      title: 'Panel de Control Físico',
      width: 320
    });
  }

  /**
   * Configura los controles para la unidad seleccionada
   * @param {number} unitIndex - 1, 2, 3 o 4
   * @param {object} moduleInstance - Instancia de la unidad activa
   * @param {object} callbacks - Funciones auxiliares (resetCamera, etc.)
   */
  updateUnitControls(unitIndex, moduleInstance, callbacks = {}) {
    this.init();

    if (unitIndex === 1) {
      this.buildUnit1Controls(moduleInstance);
    } else if (unitIndex === 2) {
      this.buildUnit2Controls(moduleInstance);
    } else if (unitIndex === 3) {
      this.buildUnit3Controls(moduleInstance);
    } else if (unitIndex === 4) {
      this.buildUnit4Controls(moduleInstance);
    }

    // Carpeta global de cámara / escena
    const envFolder = this.gui.addFolder('Entorno & Cámara');
    envFolder.close();
    envFolder.add({ reset: () => callbacks.resetCamera && callbacks.resetCamera() }, 'reset').name('Restablecer Cámara');
    envFolder.add({ toggleGrid: () => callbacks.toggleGrid && callbacks.toggleGrid() }, 'toggleGrid').name('Alternar Rejilla 3D');
  }

  buildUnit1Controls(unit1) {
    const fPresets = this.gui.addFolder('Presets de Configuración');
    const presets = {
      preset: 'dipole',
      addPos: () => unit1.addCharge((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0, 3.0),
      addNeg: () => unit1.addCharge((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0, -3.0),
      removeLast: () => unit1.removeLastCharge(),
      clear: () => unit1.clearCharges()
    };

    fPresets.add(presets, 'preset', ['dipole', 'quadrupole', 'single-positive', 'like-charges'])
      .name('Configuración')
      .onChange((val) => unit1.initPreset(val));

    fPresets.add(presets, 'addPos').name('+ Añadir Carga (+3 μC)');
    fPresets.add(presets, 'addNeg').name('- Añadir Carga (-3 μC)');
    fPresets.add(presets, 'removeLast').name('Eliminar Última Carga');
    fPresets.add(presets, 'clear').name('Limpiar Todas');

    const fGrid = this.gui.addFolder('Vectores de Campo Eléctrico');
    fGrid.add(unit1.params, 'gridSize', 3, 9, 2).name('Resolución Grid').onChange(() => unit1.rebuildFieldGrid());
    fGrid.add(unit1.params, 'gridSpacing', 0.8, 2.2, 0.1).name('Espaciado (m)').onChange(() => unit1.rebuildFieldGrid());
    fGrid.add(unit1.params, 'planeMode', ['3D-Volume', '2D-Plane']).name('Modo Visual').onChange(() => unit1.rebuildFieldGrid());
    fGrid.add(unit1.params, 'arrowScale', 0.3, 1.8, 0.1).name('Escala Flechas').onChange(() => unit1.rebuildFieldGrid());

    const fProbe = this.gui.addFolder('Sonda de Medición P(x, y, z)');
    fProbe.add(unit1.params.probePoint, 'x', -5, 5, 0.1).name('Sonda X');
    fProbe.add(unit1.params.probePoint, 'y', -5, 5, 0.1).name('Sonda Y');
    fProbe.add(unit1.params.probePoint, 'z', -5, 5, 0.1).name('Sonda Z');
  }

  buildUnit2Controls(unit2) {
    const fCap = this.gui.addFolder('Geometría & Dieléctrico');

    fCap.add(unit2.params, 'plateArea', 0.5, 4.0, 0.1)
      .name('Área de Placas A (m²)')
      .onChange(() => unit2.updatePlatesGeometry());

    fCap.add(unit2.params, 'distance', 0.4, 3.0, 0.1)
      .name('Separación d (m)')
      .onChange(() => unit2.updatePlatesGeometry());

    fCap.add(unit2.params, 'dielectricConstant', 1.0, 10.0, 0.1)
      .name('Constante κ (Dieléctrico)')
      .onChange(() => unit2.updatePlatesGeometry());

    fCap.add(unit2.params, 'dielectricInsert', 0.0, 1.0, 0.05)
      .name('Inserción Dieléctrico')
      .onChange(() => unit2.updatePlatesGeometry());

    const fElect = this.gui.addFolder('Potencial Eléctrico');
    fElect.add(unit2.params, 'voltage', 1.0, 100.0, 1.0)
      .name('Voltaje Aplicado V (V)')
      .onChange(() => unit2.rebuildFieldLines());

    fElect.add(unit2.params, 'showFringing')
      .name('Efecto de Borde')
      .onChange(() => unit2.rebuildFieldLines());

    // Materiales comunes preconfigurados
    const fMat = this.gui.addFolder('Materiales Dieléctricos');
    const matPresets = {
      vacio: () => { unit2.params.dielectricConstant = 1.0; unit2.updatePlatesGeometry(); },
      teflon: () => { unit2.params.dielectricConstant = 2.1; unit2.updatePlatesGeometry(); },
      papel: () => { unit2.params.dielectricConstant = 3.7; unit2.updatePlatesGeometry(); },
      vidrio: () => { unit2.params.dielectricConstant = 5.6; unit2.updatePlatesGeometry(); },
      ceramica: () => { unit2.params.dielectricConstant = 9.5; unit2.updatePlatesGeometry(); }
    };
    fMat.close();
    fMat.add(matPresets, 'vacio').name('Vacío / Aire (κ = 1.0)');
    fMat.add(matPresets, 'teflon').name('Teflón (κ = 2.1)');
    fMat.add(matPresets, 'papel').name('Papel seco (κ = 3.7)');
    fMat.add(matPresets, 'vidrio').name('Vidrio Pyrex (κ = 5.6)');
    fMat.add(matPresets, 'ceramica').name('Cerámica (κ = 9.5)');
  }

  buildUnit3Controls(unit3) {
    const fOhm = this.gui.addFolder('Ley de Ohm (I = V / R)');

    fOhm.add(unit3.params, 'voltage', 0.0, 36.0, 0.5)
      .name('Voltaje V (V)')
      .listen();

    fOhm.add(unit3.params, 'resistance', 1.0, 50.0, 0.5)
      .name('Resistencia R (Ω)')
      .listen();

    fOhm.add(unit3.params, 'switchClosed')
      .name('Interruptor Cerrado')
      .onChange((val) => unit3.setSwitch(val));

    const fActions = this.gui.addFolder('Acciones de Circuito');
    fActions.add({ toggleSwitch: () => unit3.setSwitch(!unit3.params.switchClosed) }, 'toggleSwitch')
      .name('Alternar Interruptor');
    fActions.add({ shortCircuit: () => { unit3.params.resistance = 1.0; unit3.params.voltage = 24.0; } }, 'shortCircuit')
      .name('Simular Máxima Carga');
  }

  buildUnit4Controls(unit4) {
    const fPresets = this.gui.addFolder('Casos Típicos de Física');
    fPresets.add(unit4.params, 'preset', ['helical', 'cyclotron', 'velocity_selector', 'drift_ExB'])
      .name('Experimento')
      .onChange((val) => unit4.applyPreset(val));

    const fB = this.gui.addFolder('Campo Magnético B (Tesla)');
    fB.add(unit4.params, 'Bx', -3.0, 3.0, 0.2).name('Bx (T)').onChange(() => unit4.rebuildFieldVectors());
    fB.add(unit4.params, 'By', -3.0, 3.0, 0.2).name('By (T)').onChange(() => unit4.rebuildFieldVectors());
    fB.add(unit4.params, 'Bz', -3.0, 3.0, 0.2).name('Bz (T)').onChange(() => unit4.rebuildFieldVectors());

    const fE = this.gui.addFolder('Campo Eléctrico E (V/m)');
    fE.add(unit4.params, 'Ex', -5.0, 5.0, 0.5).name('Ex (V/m)').onChange(() => unit4.rebuildFieldVectors());
    fE.add(unit4.params, 'Ey', -5.0, 5.0, 0.5).name('Ey (V/m)').onChange(() => unit4.rebuildFieldVectors());
    fE.add(unit4.params, 'Ez', -5.0, 5.0, 0.5).name('Ez (V/m)').onChange(() => unit4.rebuildFieldVectors());

    const fPart = this.gui.addFolder('Propiedades de la Partícula');
    fPart.add(unit4.params, 'charge', -2.0, 2.0, 0.5).name('Carga q (e)').onChange(() => unit4.resetParticle());
    fPart.add(unit4.params, 'mass', 0.5, 4.0, 0.5).name('Masa m').onChange(() => unit4.resetParticle());
    fPart.add(unit4.params, 'vx', -6.0, 6.0, 0.2).name('Velocidad vx');
    fPart.add(unit4.params, 'vy', -6.0, 6.0, 0.2).name('Velocidad vy');
    fPart.add(unit4.params, 'vz', -6.0, 6.0, 0.2).name('Velocidad vz');

    const fSim = this.gui.addFolder('Control de Trayectoria');
    fSim.add({ launch: () => unit4.resetParticle() }, 'launch').name('Re-lanzar Partícula');
    fSim.add({ clear: () => unit4.trailPoints = [] }, 'clear').name('Limpiar Rastro');
    fSim.add(unit4.params, 'isPaused').name('Pausar Movimiento');
  }

  destroy() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }
}
