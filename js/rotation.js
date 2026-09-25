import { INITIAL_ZONE_ROLES } from './config.js';

// Tracks which role currently occupies each zone (1-6) and applies the
// standard clockwise volleyball rotation: the player in zone N moves to
// zone N-1 (wrapping 1 -> 6), i.e. new[z] = old[(z % 6) + 1].
export class RotationState {
  constructor() {
    this.zoneToRole = { ...INITIAL_ZONE_ROLES };
  }

  get serverZone() {
    return 1;
  }

  roleInZone(zone) {
    return this.zoneToRole[zone];
  }

  // Reverse lookup: which zone (1-6) a role currently occupies.
  zoneOfRole(role) {
    return Object.keys(this.zoneToRole).map(Number).find((zone) => this.zoneToRole[zone] === role);
  }

  // direction: 1 for a normal (clockwise) rotation, -1 to rotate back.
  rotate(direction = 1) {
    const next = {};
    for (let zone = 1; zone <= 6; zone++) {
      const sourceZone = direction === 1
        ? (zone % 6) + 1
        : zone === 1 ? 6 : zone - 1;
      next[zone] = this.zoneToRole[sourceZone];
    }
    this.zoneToRole = next;
  }

  reset() {
    this.zoneToRole = { ...INITIAL_ZONE_ROLES };
  }
}
