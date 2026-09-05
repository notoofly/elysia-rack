// src/rack/registry.ts
var registrations = new Map;
function registerRack(reg) {
  registrations.set(reg.path, reg);
}
function listRacks() {
  return [...registrations.values()];
}
function clearRacks() {
  registrations.clear();
}

export { registerRack, listRacks, clearRacks };
