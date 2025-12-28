/**
 * 車種名稱對照表
 */
export const VEHICLE_TYPE_NAMES: Record<string, string> = {
  STANDARD: '菁英',
  PREMIUM: '尊榮',
  XL: '大型',
};

/**
 * 取得車種中文名稱
 */
export function getVehicleTypeName(type: string): string {
  return VEHICLE_TYPE_NAMES[type] || type;
}
