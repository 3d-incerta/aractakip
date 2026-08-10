"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const icon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MarkerData = {
  plaka: string;
  lat: number;
  lng: number;
  hiz?: number | null;
  zaman?: string | null;
};

export default function MapView({ markers }: { markers: MarkerData[] }) {
  const center: [number, number] =
    markers.length > 0 ? [markers[0].lat, markers[0].lng] : [39.0, 35.0];

  return (
    <MapContainer
      center={center}
      zoom={markers.length > 0 ? 10 : 6}
      style={{ height: "560px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap katkıda bulunanlar"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <Marker key={m.plaka} position={[m.lat, m.lng]} icon={icon}>
          <Popup>
            <b>{m.plaka}</b>
            <br />
            {m.hiz != null ? `${m.hiz} km/s` : ""}
            <br />
            {m.zaman ? new Date(m.zaman).toLocaleString("tr-TR") : ""}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
