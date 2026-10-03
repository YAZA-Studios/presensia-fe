import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Peta interaktif pemilih titik lokasi absen (Leaflet + tile OpenStreetMap,
 * gratis tanpa API key). Klik peta / geser marker = pindah titik; lingkaran
 * = radius geofence yang mengikuti input radius.
 */
export default function LocationPicker({ lat, lng, radiusM, onChange }: {
  lat: number; lng: number; radiusM: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  // Simpan instance peta & layer di ref — bukan state (pola wajib Leaflet,
  // supaya tidak re-render React setiap geseran marker).
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init sekali.
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView([lat, lng], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [30, 41],
    });
    const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
    const circle = L.circle([lat, lng], { radius: radiusM, color: '#2563EB', weight: 2, fillOpacity: 0.12 }).addTo(map);
    marker.on('drag dragend', () => {
      const p = marker.getLatLng();
      circle.setLatLng(p);
      onChangeRef.current(p.lat, p.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      circle.setLatLng(e.latlng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map; markerRef.current = marker; circleRef.current = circle;
    // Perbaiki tile yang kadang tidak termuat karena wadah baru terlihat.
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; circleRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkron bila titik/radius berubah dari luar (GPS saya, hasil pencarian).
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const p = L.latLng(lat, lng);
    markerRef.current?.setLatLng(p);
    circleRef.current?.setLatLng(p).setRadius(radiusM);
    map.setView(p, map.getZoom() < 15 ? 16 : map.getZoom(), { animate: true });
  }, [lat, lng, radiusM]);

  return <div ref={divRef} className="location-picker" />;
}
