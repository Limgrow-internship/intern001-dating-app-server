/**
 * Distance Calculator using Haversine formula
 * Calculates great-circle distances between two points on Earth
 */
export class DistanceCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculate distance between two geographic coordinates
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in kilometers (rounded to 1 decimal)
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = DistanceCalculator.EARTH_RADIUS_KM * c;

    return distance; // Return precise distance without rounding
  }

  /**
   * Calculate distance from GeoJSON coordinates
   * @param coords1 First location [longitude, latitude]
   * @param coords2 Second location [longitude, latitude]
   * @returns Distance in kilometers
   */
  static calculateDistanceFromCoords(
    coords1: number[],
    coords2: number[],
  ): number {
    if (!coords1 || !coords2 || coords1.length < 2 || coords2.length < 2) {
      return 0;
    }

    // GeoJSON format is [longitude, latitude]
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    return this.calculateDistance(lat1, lon1, lat2, lon2);
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
