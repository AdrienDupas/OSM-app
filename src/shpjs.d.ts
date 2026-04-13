declare module 'shpjs' {
  import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

  interface ShpFeature {
    type: string;
    coordinates: unknown;
  }

  function shp(buffer: ArrayBuffer | string): Promise<FeatureCollection | FeatureCollection[]>;

  namespace shp {
    function parseShp(buffer: ArrayBuffer, prj?: string): ShpFeature[];
    function parseDbf(buffer: ArrayBuffer, cpg?: string): GeoJsonProperties[];
    function combine(args: [ShpFeature[], GeoJsonProperties[]]): FeatureCollection<Geometry, GeoJsonProperties>;
    function parseZip(buffer: ArrayBuffer): Record<string, FeatureCollection>;
  }

  export default shp;
}
