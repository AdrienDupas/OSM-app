declare module 'shpjs' {
  import type { FeatureCollection } from 'geojson';
  function shp(buffer: ArrayBuffer | string): Promise<FeatureCollection | FeatureCollection[]>;
  export default shp;
}
