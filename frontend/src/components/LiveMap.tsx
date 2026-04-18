import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Share2, StopCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import socketService from '@/services/socket';
import { locationAPI, getCurrentUser } from '@/services/api';
import React from 'react';
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
    color?: string;
    lastKnownLocation?: {
      latitude: number;
      longitude: number;
      address: string;
      timestamp: string;
    };
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
  const { userName: currentUser, role: currentUserRole } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentLocation, setCurrentLocation] = useState({ latitude, longitude, address, accuracy, status });

  // Get current user data for ID
  const currentUserData = getCurrentUser();

  // Generate different colors for different children
  const getChildColor = (child: any, index: number) => {
    const colors = [
      '#10b981', // green
      '#3b82f6', // blue  
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ];
    return child.color || colors[index % colors.length];
  };

  // Location sharing functions
  const startLocationSharing = async () => {
    try {
      setIsSharingLocation(true);
      
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: address || 'Unknown location',
        status: 'safe',
        timestamp: new Date().toISOString()
      };

      // Update local state
      setCurrentLocation(locationData);

      // Send to backend
      await locationAPI.updateLocation(locationData);

      // Emit to socket for real-time updates
      socketService.sendLocationUpdate({
        userId: currentUserData?.id,
        location: locationData
      });

      // Start periodic updates (every 15 minutes)
      const interval = setInterval(async () => {
        try {
          const freshPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });

          const freshLocationData = {
            latitude: freshPosition.coords.latitude,
            longitude: freshPosition.coords.longitude,
            accuracy: freshPosition.coords.accuracy,
            address: address || 'Unknown location',
            status: 'safe',
            timestamp: new Date().toISOString()
          };

          setCurrentLocation(freshLocationData);
          await locationAPI.updateLocation(freshLocationData);
          socketService.sendLocationUpdate({
            userId: currentUserData?.id,
            location: freshLocationData
          });
        } catch (error) {
          console.error('Failed to update location:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes

      setLocationUpdateInterval(interval);
      
    } catch (error) {
      console.error('Failed to start location sharing:', error);
      setIsSharingLocation(false);
    }
  };

  const stopLocationSharing = () => {
    setIsSharingLocation(false);
    
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      setLocationUpdateInterval(null);
    }

    // Notify backend that sharing stopped
    socketService.sendLocationUpdate({
      userId: currentUserData?.id,
      location: null,
      sharingStopped: true
    });
  };

  useEffect(() => {
    return () => {
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, [locationUpdateInterval]);
  useEffect(() => {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}, []);

  if (!latitude || !longitude) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-card rounded-2xl">
        No location available
      </div>
    );
  }
console.log(latitude, longitude);
  return (
   <div className="rounded-2xl overflow-hidden shadow-depth" style={{ height: '500px' }}>
      {/* Location Sharing Control - Only for non-parents */}
      {!isParent && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Location Sharing: {isSharingLocation ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button
              onClick={isSharingLocation ? stopLocationSharing : startLocationSharing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isSharingLocation 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isSharingLocation ? (
                <>
                  <StopCircle className="w-4 h-4" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share Location
                </>
              )}
            </button>
          </div>
          {isSharingLocation && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">✓ Live tracking active</span> - Updates every 15 minutes
            </div>
          )}
        </div>
      )}

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
  center={[28.6139, 77.2090]}
  zoom={13}
  style={{ height: '400px', width: '100%' }}
>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />


      {/* Parent location marker - always show for parent view */}
      {isParent && (
        <Marker 
          position={[latitude, longitude]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-4 border-white shadow-lg">
                <span class="text-white text-sm font-bold">P</span>
              </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        >
          <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
          <Popup>
            <div>
              <strong>Parent (You)</strong>
              <br />
              {address || 'Your Location'}
              {accuracy && (
                <div className="text-xs text-gray-600">
                  Accuracy: &plusmn;{accuracy}m
                </div>
              )}
              <div className="text-xs text-blue-600 font-semibold mt-1">
                This is your current location
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Main user marker - show for non-parents */}
      {!isParent && (
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
      )}

      {/* Child location markers for parent view */}
      {isParent && childLocations && childLocations.map((child, index) => (
        <React.Fragment key={child.id}>
          <Marker
            key={`current-${child.id}`}
            position={[child.latitude, child.longitude]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="flex items-center justify-center w-6 h-6 rounded-full" style="background-color: ${getChildColor(child, index)}">
                <span class="text-white text-xs font-bold">${child.name.charAt(0).toUpperCase()}</span>
              </div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          >
            <Popup>
              <div>
                <strong>{child.name} - Current</strong>
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

          {/* Last known location marker */}
          {child.lastKnownLocation && (
            <Marker
              key={`last-${child.id}`}
              position={[child.lastKnownLocation.latitude, child.lastKnownLocation.longitude]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 border-2 border-white">
                  <span class="text-white text-xs font-bold">${child.name.charAt(0).toUpperCase()}</span>
                </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              })}
            >
              <Popup>
                <div>
                  <strong>{child.name} - Last Known</strong>
                  <br />
                  <span className="text-gray-600 font-semibold">Previous Location</span>
                  <br />
                  Time: {new Date(child.lastKnownLocation.timestamp).toLocaleString()}
                  <br />
                  {child.lastKnownLocation.address && `Location: ${child.lastKnownLocation.address}`}
                </div>
              </Popup>
            </Marker>
          )}
        </React.Fragment>
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
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full border border-white" />
              <span>Last Known Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span>Parent Location</span>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};