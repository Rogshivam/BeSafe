import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect } from 'react';

interface Props {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  status?: string;
  isParent?: boolean;
  childLocations?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
    status: string;
    address?: string;
  }>;
}

// Fix marker icon issue (VERY IMPORTANT)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export const LiveMap = ({ latitude, longitude, address, accuracy, status, isParent, childLocations }: Props) => {
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  if (!latitude || !longitude) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-card rounded-2xl">
        No location available
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-depth">
      {/* Parent View: Show child locations */}
      {isParent && childLocations && childLocations.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Monitoring {childLocations.length} Child(ren)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {childLocations.map((child) => (
              <div
                key={child.id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedChild === child.id ? 'bg-blue-200' : 'bg-white hover:bg-blue-100'
                }`}
                onClick={() => setSelectedChild(child.id === selectedChild ? null : child.id)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    child.status === 'safe' ? 'bg-green-500' : 
                    child.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm font-medium">{child.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Last: {new Date(child.lastUpdate).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Main user marker */}
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div>
              <strong>{status || 'User'}</strong>
              <br />
              {address || 'Unknown location'}
              {accuracy && (
                <div className="text-xs text-gray-600">
                  Accuracy: &plusmn;{accuracy}m
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Child location markers for parent view */}
        {isParent && childLocations && childLocations.map((child) => (
          <Marker
            key={child.id}
            position={[child.latitude, child.longitude]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="flex items-center justify-center w-6 h-6 rounded-full ${
                child.status === 'safe' ? 'bg-green-500' : 
                child.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }">
                <span class="text-white text-xs font-bold">${child.name.charAt(0).toUpperCase()}</span>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div>
                <strong>{child.name}</strong>
                <br />
                Status: <span className={`font-semibold ${
                  child.status === 'safe' ? 'text-green-600' : 
                  child.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>{child.status}</span>
                <br />
                Last Update: {new Date(child.lastUpdate).toLocaleString()}
                <br />
                {child.address && `Location: ${child.address}`}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Accuracy radius */}
        {accuracy && (
          <Circle
            center={[latitude, longitude]}
            radius={accuracy}
            fillColor={status === 'safe' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'}
            fillOpacity={0.2}
            color={status === 'safe' ? '#059669' : status === 'warning' ? '#d97706' : '#dc2626'}
          />
        )}
      </MapContainer>

      {/* Child selection legend for parent view */}
      {isParent && childLocations && childLocations.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Emergency</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};