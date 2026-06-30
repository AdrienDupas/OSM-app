declare module 'shpjs' {
  import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

  interface ShpGeometry {
    type: string;
    coordinates: unknown;
  }

  function shp(
    buffer: ArrayBuffer | string,
  ): Promise<FeatureCollection | FeatureCollection[]>;

  export default shp;

  export function parseShp(buffer: ArrayBuffer | ArrayBufferView, prj?: string): ShpGeometry[];
  export function parseDbf(buffer: ArrayBuffer | ArrayBufferView, cpg?: string): GeoJsonProperties[];
  export function combine(
    args: [ShpGeometry[], GeoJsonProperties[] | undefined],
  ): FeatureCollection<Geometry, GeoJsonProperties>;
  export function parseZip(
    buffer: ArrayBuffer | ArrayBufferView,
  ): Promise<FeatureCollection | FeatureCollection[]>;
}
