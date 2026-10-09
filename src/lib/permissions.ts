import { Cargo, CARGOS } from '../types'

/**
 * Hierarquia de autoridade (índice 0 = maior poder):
 * Coordenador > Supervisor > Gerente
 */
export function hasCargoPermission(
  userCargo: Cargo | string | undefined | null,
  requiredCargo: Cargo,
): boolean {
  if (!userCargo) return false
  const userLevel = CARGOS.indexOf(userCargo as Cargo)
  const requiredLevel = CARGOS.indexOf(requiredCargo)
  if (userLevel === -1 || requiredLevel === -1) return false
  return userLevel <= requiredLevel
}

export function cargoLabel(cargo: Cargo | string): string {
  return cargo
}
