/**
 * PhysicsEngine.js
 * Motor de cálculo físico para Física II:
 * - Electrostática (Ley de Coulomb, Campo Eléctrico, Potencial Eléctrico)
 * - Capacitancia (Placas paralelas, Dieléctrico, C, U, Q, E)
 * - Circuitos (Ley de Ohm, Corriente, Potencia, Velocidad de deriva)
 * - Magnetismo & Fuerza de Lorentz (Integrador numérico RK4, F = q(E + v x B))
 */

// Constantes físicas fundamentales (Sistema Internacional - SI)
export const CONSTANTS = {
  // Constante de permitividad del vacío (F/m)
  EPSILON_0: 8.8541878128e-12,
  // Constante electrostática de Coulomb: ke = 1 / (4 * pi * eps0) (N·m²/C²)
  K_COULOMB: 8.9875517923e9,
  // Permeabilidad magnética del vacío (T·m/A o N/A²)
  MU_0: 4 * Math.PI * 1e-7,
  // Carga elemental del electrón / protón (C)
  E_CHARGE: 1.602176634e-19,
  // Masa del electrón (kg)
  ELECTRON_MASS: 9.1093837e-31,
  // Masa del protón (kg)
  PROTON_MASS: 1.6726219e-27,
  // Factor de escala visual para simulaciones interactivas
  VISUAL_SCALE: {
    k_sim: 1.0,         // Para visualización dimensional normalizada
    charge_unit: 1e-6,   // 1 unidad visual = 1 microCoulomb (uC)
    softening: 0.18      // Evita singularidades (división por cero) r -> 0
  }
};

export class PhysicsEngine {
  constructor() {
    this.constants = CONSTANTS;
  }

  // ==========================================
  // UNIDAD 1: ELECTROSTÁTICA
  // ==========================================

  /**
   * Calcula el vector de Campo Eléctrico E en un punto P(x, y, z)
   * debido a un conjunto de cargas puntuales:
   * E = ke * sum( qi * (P - ri) / |P - ri|^3 )
   * @param {{x: number, y: number, z: number}} point - Punto de evaluación
   * @param {Array<{x: number, y: number, z: number, q: number}>} charges - Lista de cargas
   * @param {boolean} realisticUnits - True para usar K_COULOMB (SI), False para escala visual
   * @returns {{vector: {x: number, y: number, z: number}, magnitude: number, direction: {x: number, y: number, z: number}}}
   */
  calculateElectricField(point, charges, realisticUnits = false) {
    let Ex = 0;
    let Ey = 0;
    let Ez = 0;

    const k = realisticUnits ? this.constants.K_COULOMB : this.constants.VISUAL_SCALE.k_sim;
    const eps = this.constants.VISUAL_SCALE.softening;

    for (const c of charges) {
      const rx = point.x - c.x;
      const ry = point.y - c.y;
      const rz = point.z - c.z;
      const distSq = rx * rx + ry * ry + rz * rz + eps * eps;
      const dist = Math.sqrt(distSq);

      // qi / dist^3
      const factor = (k * c.q) / (distSq * dist);
      Ex += factor * rx;
      Ey += factor * ry;
      Ez += factor * rz;
    }

    const magnitude = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    const direction = magnitude > 1e-9 ? {
      x: Ex / magnitude,
      y: Ey / magnitude,
      z: Ez / magnitude
    } : { x: 0, y: 0, z: 0 };

    return {
      vector: { x: Ex, y: Ey, z: Ez },
      magnitude,
      direction
    };
  }

  /**
   * Calcula el potencial eléctrico escalar V en un punto P(x, y, z)
   * V = ke * sum( qi / |P - ri| )
   * @param {{x: number, y: number, z: number}} point
   * @param {Array<{x: number, y: number, z: number, q: number}>} charges
   * @param {boolean} realisticUnits
   * @returns {number} Potencial en Voltios (o unidades relativas)
   */
  calculateElectricPotential(point, charges, realisticUnits = false) {
    let V = 0;
    const k = realisticUnits ? this.constants.K_COULOMB : this.constants.VISUAL_SCALE.k_sim;
    const eps = this.constants.VISUAL_SCALE.softening;

    for (const c of charges) {
      const rx = point.x - c.x;
      const ry = point.y - c.y;
      const rz = point.z - c.z;
      const dist = Math.sqrt(rx * rx + ry * ry + rz * rz + eps * eps);
      V += (k * c.q) / dist;
    }
    return V;
  }

  // ==========================================
  // UNIDAD 2: CONDENSADORES (CAPACITANCIA)
  // ==========================================

  /**
   * Calcula la capacitancia de un condensador de placas paralelas con dieléctrico
   * C = (kappa * epsilon_0 * A) / d
   * @param {number} area - Área de las placas en m²
   * @param {number} distance - Distancia de separación en m
   * @param {number} dielectricConstant - Constante dieléctrica (kappa >= 1)
   * @returns {number} Capacitancia en Faradios (F)
   */
  calculateCapacitance(area, distance, dielectricConstant = 1.0) {
    if (distance <= 0) return 0;
    return (dielectricConstant * this.constants.EPSILON_0 * area) / distance;
  }

  /**
   * Calcula la energía electrostática almacenada en el condensador
   * U = 0.5 * C * V²
   * @param {number} capacitance - Capacitancia en Faradios
   * @param {number} voltage - Voltaje aplicado en Voltios
   * @returns {number} Energía en Joules (J)
   */
  calculateCapacitorEnergy(capacitance, voltage) {
    return 0.5 * capacitance * voltage * voltage;
  }

  /**
   * Calcula la carga total acumulada en las placas
   * Q = C * V
   * @param {number} capacitance - En Faradios
   * @param {number} voltage - En Voltios
   * @returns {number} Carga en Coulombs (C)
   */
  calculateCapacitorCharge(capacitance, voltage) {
    return capacitance * voltage;
  }

  /**
   * Calcula el campo eléctrico uniforme interno entre las placas
   * E = V / d (o E = sigma / (kappa * eps0))
   * @param {number} voltage - En Voltios
   * @param {number} distance - En Metros
   * @returns {number} Campo en V/m
   */
  calculateCapacitorField(voltage, distance) {
    if (distance <= 0) return 0;
    return voltage / distance;
  }

  // ==========================================
  // UNIDAD 3: CIRCUITOS Y LEY DE OHM
  // ==========================================

  /**
   * Calcula la corriente eléctrica según la Ley de Ohm
   * I = V / R
   * @param {number} voltage - Voltaje de la fuente en Voltios (V)
   * @param {number} resistance - Resistencia total en Ohmios (Ω)
   * @returns {number} Corriente en Amperios (A)
   */
  calculateCurrent(voltage, resistance) {
    if (resistance <= 0) return 0;
    return voltage / resistance;
  }

  /**
   * Calcula la potencia eléctrica disipada (Efecto Joule)
   * P = V * I = I² * R
   * @param {number} voltage - Voltios
   * @param {number} current - Amperios
   * @returns {number} Potencia en Vatios (W)
   */
  calculatePower(voltage, current) {
    return voltage * current;
  }

  /**
   * Calcula la velocidad relativa o de deriva para la animación de portadores
   * v_drift = I / (n * q * A)
   * @param {number} current - Corriente en Amperios
   * @returns {number} Velocidad normalizada de animación
   */
  calculateElectronDriftSpeed(current) {
    return Math.max(0, current * 1.5);
  }

  // ==========================================
  // UNIDAD 4: CAMPO MAGNÉTICO Y FUERZA DE LORENTZ
  // ==========================================

  /**
   * Calcula la Fuerza de Lorentz vectorial completa:
   * F = q * ( E + v x B )
   * Producto vectorial v x B:
   *   (v x B)_x = v.y * B.z - v.z * B.y
   *   (v x B)_y = v.z * B.x - v.x * B.z
   *   (v x B)_z = v.x * B.y - v.y * B.x
   * @param {number} q - Carga de la partícula
   * @param {{x: number, y: number, z: number}} velocity - Vector velocidad v
   * @param {{x: number, y: number, z: number}} electricField - Vector campo E
   * @param {{x: number, y: number, z: number}} magneticField - Vector campo B
   * @returns {{x: number, y: number, z: number}} Fuerza F
   */
  calculateLorentzForce(q, velocity, electricField, magneticField) {
    // Producto cruz: v x B
    const vxB_x = velocity.y * magneticField.z - velocity.z * magneticField.y;
    const vxB_y = velocity.z * magneticField.x - velocity.x * magneticField.z;
    const vxB_z = velocity.x * magneticField.y - velocity.y * magneticField.x;

    // F = q * (E + v x B)
    const Fx = q * (electricField.x + vxB_x);
    const Fy = q * (electricField.y + vxB_y);
    const Fz = q * (electricField.z + vxB_z);

    return { x: Fx, y: Fy, z: Fz };
  }

  /**
   * Calcula el radio de ciclotrón (giro) en campo magnético puro:
   * r = (m * v_perp) / (|q| * B)
   * @param {number} mass
   * @param {number} vPerp
   * @param {number} q
   * @param {number} B
   * @returns {number} Radio en metros
   */
  calculateCyclotronRadius(mass, vPerp, q, B) {
    if (Math.abs(q) < 1e-15 || B <= 1e-9) return Infinity;
    return (mass * vPerp) / (Math.abs(q) * B);
  }

  /**
   * Integrador numérico Runge-Kutta de 4to Orden (RK4) para la trayectoria de la partícula
   * dX/dt = V
   * dV/dt = F / m = (q/m) * (E + V x B)
   * Proporciona altísima estabilidad orbital y exactitud física sin divergencia numérica.
   * @param {{position: {x:number, y:number, z:number}, velocity: {x:number, y:number, z:number}, q: number, mass: number}} particle
   * @param {number} dt - Paso de tiempo
   * @param {{x: number, y: number, z: number}} E - Vector campo eléctrico
   * @param {{x: number, y: number, z: number}} B - Vector campo magnético
   * @returns {{position: {x:number, y:number, z:number}, velocity: {x:number, y:number, z:number}, acceleration: {x:number, y:number, z:number}}}
   */
  integrateRK4(particle, dt, E, B) {
    const { position: p, velocity: v, q, mass } = particle;
    const invMass = 1.0 / (mass > 0 ? mass : 1.0);

    // Función derivada de velocidad: a = (q / m) * (E + v x B)
    const calcAccel = (vel) => {
      const vxB_x = vel.y * B.z - vel.z * B.y;
      const vxB_y = vel.z * B.x - vel.x * B.z;
      const vxB_z = vel.x * B.y - vel.y * B.x;
      return {
        x: q * (E.x + vxB_x) * invMass,
        y: q * (E.y + vxB_y) * invMass,
        z: q * (E.z + vxB_z) * invMass
      };
    };

    // k1
    const v1 = { ...v };
    const a1 = calcAccel(v1);

    // k2 (en t + dt/2 con k1)
    const v2 = {
      x: v.x + a1.x * (dt * 0.5),
      y: v.y + a1.y * (dt * 0.5),
      z: v.z + a1.z * (dt * 0.5)
    };
    const a2 = calcAccel(v2);

    // k3 (en t + dt/2 con k2)
    const v3 = {
      x: v.x + a2.x * (dt * 0.5),
      y: v.y + a2.y * (dt * 0.5),
      z: v.z + a2.z * (dt * 0.5)
    };
    const a3 = calcAccel(v3);

    // k4 (en t + dt con k3)
    const v4 = {
      x: v.x + a3.x * dt,
      y: v.y + a3.y * dt,
      z: v.z + a3.z * dt
    };
    const a4 = calcAccel(v4);

    // Combinación ponderada RK4
    const newPos = {
      x: p.x + (dt / 6.0) * (v1.x + 2 * v2.x + 2 * v3.x + v4.x),
      y: p.y + (dt / 6.0) * (v1.y + 2 * v2.y + 2 * v3.y + v4.y),
      z: p.z + (dt / 6.0) * (v1.z + 2 * v2.z + 2 * v3.z + v4.z)
    };

    const newVel = {
      x: v.x + (dt / 6.0) * (a1.x + 2 * a2.x + 2 * a3.x + a4.x),
      y: v.y + (dt / 6.0) * (a1.y + 2 * a2.y + 2 * a3.y + a4.y),
      z: v.z + (dt / 6.0) * (a1.z + 2 * a2.z + 2 * a3.z + a4.z)
    };

    return {
      position: newPos,
      velocity: newVel,
      acceleration: a1
    };
  }
}
