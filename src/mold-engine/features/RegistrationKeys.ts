import * as THREE from 'three';

export interface RegistrationKeyConfig {
  /** Cone height protruding from surface */
  height: number;
  /** Cone base radius */
  baseRadius: number;
  /** Cone tip radius (slightly rounded for easier alignment) */
  tipRadius: number;
  /** Clearance added to socket for tolerance */
  socketClearance: number;
}

const DEFAULT_CONFIG: RegistrationKeyConfig = {
  height: 6,
  baseRadius: 5,
  tipRadius: 1.5,
  socketClearance: 0.3,
};

/**
 * Generates registration key cone geometries for aligning 2-part mold halves.
 *
 * Keys are placed at 4 corners of the parting plane, inset from the mold edges.
 * Returns both "pin" geometries (added to bottom half) and "socket" geometries
 * (subtracted from top half) with clearance for fit.
 *
 * @param moldWidth Mold outer width (X)
 * @param moldDepth Mold outer depth (Z)
 * @param partingY Y-coordinate of the parting plane
 * @param moldCenterX X center of the mold
 * @param moldCenterZ Z center of the mold
 * @param config Optional key dimensions
 */
export function generateRegistrationKeys(
  moldWidth: number,
  moldDepth: number,
  partingY: number,
  moldCenterX: number,
  moldCenterZ: number,
  config: RegistrationKeyConfig = DEFAULT_CONFIG
): { pins: THREE.BufferGeometry[]; sockets: THREE.BufferGeometry[] } {
  const { height, baseRadius, tipRadius, socketClearance } = config;

  // Place keys at 4 corners, inset from mold edges by base radius + margin
  const inset = baseRadius + 4;
  const halfW = moldWidth / 2 - inset;
  const halfD = moldDepth / 2 - inset;

  const corners = [
    [moldCenterX - halfW, moldCenterZ - halfD],
    [moldCenterX + halfW, moldCenterZ - halfD],
    [moldCenterX - halfW, moldCenterZ + halfD],
    [moldCenterX + halfW, moldCenterZ + halfD],
  ];

  const segments = 16;

  const pins: THREE.BufferGeometry[] = [];
  const sockets: THREE.BufferGeometry[] = [];

  for (const [cx, cz] of corners) {
    // Pin: cone pointing up from parting plane
    const pinGeo = new THREE.CylinderGeometry(tipRadius, baseRadius, height, segments);
    pinGeo.translate(cx, partingY + height / 2, cz);
    pins.push(pinGeo);

    // Socket: slightly larger cone for the receiving half
    const socketGeo = new THREE.CylinderGeometry(
      tipRadius + socketClearance,
      baseRadius + socketClearance,
      height + socketClearance * 2,
      segments
    );
    socketGeo.translate(cx, partingY + height / 2, cz);
    sockets.push(socketGeo);
  }

  return { pins, sockets };
}
