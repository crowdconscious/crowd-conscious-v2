/**
 * Colonia centroids for sim-viewer map fallback (Cuauhtémoc + Miguel Hidalgo).
 * Derived from public/geo/colonias-cuau-mh.geojson polygon centroids.
 * Used when simulation_personas.ageb_code / centroid_* are null.
 */

export type ColoniaCentroid = {
  colonia: string
  alcaldia: string
  lat: number
  lng: number
}

export const COLONIA_CENTROIDS: readonly ColoniaCentroid[] = [
  { colonia: "Ampliación Granada", alcaldia: "Miguel Hidalgo", lat: 19.443103, lng: -99.201082 },
  { colonia: "Anáhuac", alcaldia: "Miguel Hidalgo", lat: 19.444192, lng: -99.176457 },
  { colonia: "Buenos Aires", alcaldia: "Cuauhtémoc", lat: 19.405445, lng: -99.149796 },
  { colonia: "Condesa", alcaldia: "Cuauhtémoc", lat: 19.414727, lng: -99.176356 },
  { colonia: "Doctores", alcaldia: "Cuauhtémoc", lat: 19.416978, lng: -99.148975 },
  { colonia: "Escandón", alcaldia: "Miguel Hidalgo", lat: 19.401656, lng: -99.178942 },
  { colonia: "Hipódromo Condesa", alcaldia: "Cuauhtémoc", lat: 19.409286, lng: -99.179474 },
  { colonia: "Morelos", alcaldia: "Cuauhtémoc", lat: 19.446847, lng: -99.129974 },
  { colonia: "Polanco", alcaldia: "Miguel Hidalgo", lat: 19.433534, lng: -99.198716 },
  { colonia: "Popo", alcaldia: "Miguel Hidalgo", lat: 19.445685, lng: -99.19987 },
  { colonia: "Popotla", alcaldia: "Miguel Hidalgo", lat: 19.454529, lng: -99.179338 },
  { colonia: "Roma Norte", alcaldia: "Cuauhtémoc", lat: 19.418323, lng: -99.162626 },
  { colonia: "San Miguel Chapultepec", alcaldia: "Miguel Hidalgo", lat: 19.411526, lng: -99.185274 },
  { colonia: "San Rafael", alcaldia: "Cuauhtémoc", lat: 19.438016, lng: -99.162486 },
  { colonia: "Santa María la Ribera", alcaldia: "Cuauhtémoc", lat: 19.448365, lng: -99.158788 },
  { colonia: "Tacuba", alcaldia: "Miguel Hidalgo", lat: 19.456878, lng: -99.188267 },
]

export const ALCALDIA_CENTROIDS: Readonly<Record<string, { lat: number; lng: number }>> = {
  Cuauhtémoc: { lat: 19.43297, lng: -99.14816 },
  'Miguel Hidalgo': { lat: 19.42966, lng: -99.19867 },
}
