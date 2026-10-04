import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicsEngine } from './physicsEngine.js';
import { GuiControls } from './guiControls.js';
import { Unit1Electrostatics } from './modules/unit1_electrostatics.js';
import { Unit2Capacitors } from './modules/unit2_capacitors.js';
import { Unit3Circuits } from './modules/unit3_circuits.js';
import { Unit4Magnetism } from './modules/unit4_magnetism.js';

/**
 * Main Application Controller
 * Inicialización de la escena 3D, cámara, luces, render loop y gestor de módulos de Física II
 */
class PhysicsSimulatorApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.guiContainer = document.getElementById('gui-container');
    this.telemetryBox = document.getElementById('telemetry-content');
    this.unitTitleElement = document.getElementById('active-unit-title');
    this.formulaBox = document.getElementById('unit-formula-box');

    // Módulos y Estado
    this.activeUnitIndex = 1;
    this.isPaused = false;
    this.physics = new PhysicsEngine();

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    // Objetos de escena
    this.gridHelper = null;
    this.modules = {};

    this.initThree();
    this.initLights();
    this.initEnvironment();
    this.initModules();
    this.initUI();

    // Iniciar render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.035);

    // 2. Cámara
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(6, 5, 8);

    // 3. Renderizador WebGL
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Controles orbitales
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 35;
    this.controls.minDistance = 1.5;

    // Redimensionado de ventana
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initLights() {
    // Luz ambiental fría de laboratorio
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.6);
    this.scene.add(ambient);

    // Luz principal direccional
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(8, 12, 10);
    this.scene.add(dirLight1);

    // Luz de relleno con tinte cian/azul
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-10, -5, -8);
    this.scene.add(fillLight);

    // Luz puntual decorativa en el centro
    const centerPointLight = new THREE.PointLight(0x60a5fa, 0.4, 20);
    centerPointLight.position.set(0, 4, 0);
    this.scene.add(centerPointLight);
  }

  initEnvironment() {
    // Rejilla tridimensional de referencia
    this.gridHelper = new THREE.GridHelper(20, 20, 0x0284c7, 0x1e293b);
    this.gridHelper.position.y = -2.5;
    this.scene.add(this.gridHelper);

    // Ejes visuales sutiles
    const axes = new THREE.AxesHelper(1.5);
    axes.position.set(-9, -2.4, -9);
    this.scene.add(axes);
  }

  initModules() {
    // Crear instancias de los 4 módulos
    this.modules[1] = new Unit1Electrostatics(this.scene, this.physics);
    this.modules[2] = new Unit2Capacitors(this.scene, this.physics);
    this.modules[3] = new Unit3Circuits(this.scene, this.physics);
    this.modules[4] = new Unit4Magnetism(this.scene, this.physics);

    // Crear controlador GUI
    this.guiControls = new GuiControls(this.guiContainer);

    // Activar Unidad 1 por defecto
    this.selectUnit(1);
  }

  selectUnit(unitIndex) {
    this.activeUnitIndex = unitIndex;

    // Actualizar visibilidad de módulos
    for (let i = 1; i <= 4; i++) {
      if (this.modules[i]) {
        this.modules[i].setVisible(i === unitIndex);
      }
    }

    // Actualizar pestañas en UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const idx = parseInt(btn.dataset.unit, 10);
      if (idx === unitIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Posicionar la cámara para mejor encuadre del módulo
    this.resetCameraForUnit(unitIndex);

    // Actualizar lil-gui
    this.guiControls.updateUnitControls(unitIndex, this.modules[unitIndex], {
      resetCamera: () => this.resetCameraForUnit(unitIndex),
      toggleGrid: () => this.toggleGrid()
    });

    // Actualizar cabecera de telemetría y fórmulas
    this.updateHUDHeader(unitIndex);
  }

  resetCameraForUnit(unitIndex) {
    if (unitIndex === 1) {
      this.camera.position.set(0, 4.5, 9.5);
      this.controls.target.set(0, 0, 0);
    } else if (unitIndex === 2) {
      this.camera.position.set(4.5, 2.5, 5.5);
      this.controls.target.set(0, 0, 0);
    } else if (unitIndex === 3) {
      this.camera.position.set(0, 3.0, 8.5);
      this.controls.target.set(0, 0, 0);
    } else if (unitIndex === 4) {
      this.camera.position.set(7.0, 5.0, 8.0);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  toggleGrid() {
    if (this.gridHelper) {
      this.gridHelper.visible = !this.gridHelper.visible;
    }
  }

  updateHUDHeader(unitIndex) {
    const titles = {
      1: 'Módulo 1: Electrostática & Campo Eléctrico 3D',
      2: 'Módulo 2: Condensadores & Dieléctricos',
      3: 'Módulo 3: Circuitos Eléctricos & Ley de Ohm',
      4: 'Módulo 4: Campo Magnético & Fuerza de Lorentz'
    };

    const formulas = {
      1: 'E = ke · Σ (qi / ri²) r̂  |  V = ke · Σ (qi / ri)',
      2: 'C = (κ · ε₀ · A) / d  |  U = ½ C V²  |  Q = C · V',
      3: 'I = V / R  |  P = V · I = I² · R  |  vd ∝ I',
      4: 'F = q · (E + v × B)  |  r_ciclotrón = (m · v⊥) / (|q| · B)'
    };

    if (this.unitTitleElement) this.unitTitleElement.innerText = titles[unitIndex] || '';
    if (this.formulaBox) this.formulaBox.innerText = formulas[unitIndex] || '';
  }

  updateTelemetryUI() {
    const activeModule = this.modules[this.activeUnitIndex];
    if (!activeModule || !this.telemetryBox) return;

    const data = activeModule.getTelemetry();
    let html = '<div class="metrics-grid">';

    for (const [key, value] of Object.entries(data)) {
      // Convertir camelCase a etiqueta legible
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

      // Estilo de color según valor
      let colorClass = 'cyan';
      if (key.includes('current') || key.includes('capacitance') || key.includes('electricField')) {
        colorClass = 'cyan';
      } else if (key.includes('energy') || key.includes('power')) {
        colorClass = 'amber';
      } else if (key.includes('lorentz') || key.includes('charge')) {
        colorClass = 'red';
      } else if (key.includes('state')) {
        colorClass = value.includes('ON') ? 'emerald' : 'amber';
      }

      html += `
        <div class="metric-item">
          <div class="metric-label">${label}</div>
          <div class="metric-value ${colorClass}">${value}</div>
        </div>
      `;
    }

    html += '</div>';
    this.telemetryBox.innerHTML = html;
  }

  initUI() {
    // Botones de pestañas de módulos
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const unit = parseInt(e.currentTarget.dataset.unit, 10);
        if (unit) this.selectUnit(unit);
      });
    });

    // Botón de ayuda / información
    const btnHelp = document.getElementById('btn-help');
    const modal = document.getElementById('info-modal');
    const modalClose = document.getElementById('modal-close');

    if (btnHelp && modal) {
      btnHelp.addEventListener('click', () => modal.classList.add('open'));
    }
    if (modalClose && modal) {
      modalClose.addEventListener('click', () => modal.classList.remove('open'));
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    }

    // Botón de captura / restablecer cámara
    const btnResetCam = document.getElementById('btn-reset-cam');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => this.resetCameraForUnit(this.activeUnitIndex));
    }

    // Botón de pausa
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        btnPause.classList.toggle('active', this.isPaused);
        btnPause.innerHTML = this.isPaused ? '▶ Reanudar' : '⏸ Pausar';
      });
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.controls.update();

    // Actualizar simulación si no está en pausa
    if (!this.isPaused) {
      const activeModule = this.modules[this.activeUnitIndex];
      if (activeModule && activeModule.update) {
        activeModule.update(time, delta);
      }
    }

    // Actualizar telemetría cada frame
    this.updateTelemetryUI();

    // Renderizar escena
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  new PhysicsSimulatorApp();
});
