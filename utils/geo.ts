export const POLAND_1918_BOUNDS = {
  minLat: 49.0,
  maxLat: 54.8,
  minLon: 14.1,
  maxLon: 24.1
};

export function mercatorProjection(lat: number, lon: number) {
  // Simplified projection for graph placement
  const x = (lon - POLAND_1918_BOUNDS.minLon) * 10;
  const y = (POLAND_1918_BOUNDS.maxLat - lat) * 10;
  return { x, y };
}