import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Share2, 
  StopCircle, 
  Navigation, 
  Clock, 
  Route, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCw, 
  AlertCircle, 
  X, 
  Loader2, 
  Compass, 
  Milestone,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import socketService from '@/services/socket';
import { locationAPI, getCurrentUser } from '@/services/api';
import { fetchOSRMRoute, RouteResult, Coordinate } from '@/services/routingService';
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
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to fit map bounds to the calculated road route
const FitRouteBounds = ({ coordinates }: { coordinates: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch (err) {
        console.error('Failed to fit bounds to route:', err);
      }
    }
  }, [coordinates, map]);

  return null;
};

const RecenterMap = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const map = useMap();

  useEffect(() => {
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      map.setView([latitude, longitude], map.getZoom());
    }
  }, [latitude, longitude, map]);

  return null;
};

// Component to focus on a specific turn-by-turn maneuver step
const FocusMapLocation = ({ targetLocation }: { targetLocation: [number, number] | null }) => {
  const map = useMap();

  useEffect(() => {
    if (targetLocation && targetLocation[0] && targetLocation[1]) {
      map.flyTo(targetLocation, 16, { duration: 1 });
    }
  }, [targetLocation, map]);

  return null;
};

export const LiveMap = ({ latitude, longitude, address, accuracy, status, isParent, childLocations }: Props) => {
  const { userName: currentUser, role: currentUserRole } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentLocation, setCurrentLocation] = useState({ latitude, longitude, address, accuracy, status });
  const [isMounted, setIsMounted] = useState(false);

  // Routing State
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [activeDestination, setActiveDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [focusedStepLocation, setFocusedStepLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update current location if props change
  useEffect(() => {
    setCurrentLocation(prev => ({
      ...prev,
      latitude,
      longitude,
      address,
      accuracy,
      status
    }));
  }, [latitude, longitude, address, accuracy, status]);

  // Recalculate route if destination child's location updates in real-time
  useEffect(() => {
    if (activeDestination && childLocations) {
      const updatedChild = childLocations.find(c => c.name === activeDestination.name || c.id === selectedChild);
      if (
        updatedChild &&
        (updatedChild.latitude !== activeDestination.lat || updatedChild.longitude !== activeDestination.lng)
      ) {
        handleCalculateRoute(
          { lat: latitude, lng: longitude, label: address || 'Your Location' },
          { lat: updatedChild.latitude, lng: updatedChild.longitude, label: updatedChild.name }
        );
      }
    }
  }, [childLocations]);

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

  // Route calculation handler using OSRM
  const handleCalculateRoute = async (start: Coordinate, destination: Coordinate) => {
    if (!start.lat || !start.lng || !destination.lat || !destination.lng) {
      setRoutingError('Invalid start or destination coordinates.');
      return;
    }

    try {
      setIsRoutingLoading(true);
      setRoutingError(null);
      setActiveDestination({
        lat: destination.lat,
        lng: destination.lng,
        name: destination.label || 'Destination'
      });

      const result = await fetchOSRMRoute(start, destination);
      setRouteData(result);
    } catch (err: any) {
      console.error('OSRM Route Calculation Failed:', err);
      setRoutingError(err.message || 'Failed to calculate road route. Please try again.');
      setRouteData(null);
    } finally {
      setIsRoutingLoading(false);
    }
  };

  // Clear current route
  const handleClearRoute = () => {
    setRouteData(null);
    setActiveDestination(null);
    setRoutingError(null);
    setFocusedStepLocation(null);
  };

  // Location sharing functions
  const startLocationSharing = async () => {
    try {
      setIsSharingLocation(true);

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

      setCurrentLocation(locationData);
      await locationAPI.updateLocation(locationData);

      socketService.sendLocationUpdate({
        userId: currentUserData?.id,
        location: locationData
      });

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
      }, 15 * 60 * 1000);

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

  if (!isMounted) return null;
  if (
    latitude == null ||
    longitude == null ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-card rounded-2xl border">
        <div className="text-center p-6 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No location coordinates available</p>
        </div>
      </div>
    );
  }

  // Get maneuver icon based on instruction type and modifier
  const getManeuverIcon = (type: string, modifier?: string) => {
    if (type === 'arrive') return <MapPin className="w-4 h-4 text-emerald-600" />;
    if (type === 'depart') return <Compass className="w-4 h-4 text-blue-600" />;
    if (type === 'roundabout' || type === 'rotary') return <RotateCw className="w-4 h-4 text-amber-600" />;
    if (modifier?.includes('right')) return <CornerUpRight className="w-4 h-4 text-indigo-600" />;
    if (modifier?.includes('left')) return <CornerUpLeft className="w-4 h-4 text-indigo-600" />;
    return <ArrowUp className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Location Sharing Control - Only for non-parents */}
      {!isParent && (
        <div className="p-3 bg-muted/60 border rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-foreground/70" />
              <span className="text-sm font-medium text-foreground">
                Location Sharing: {isSharingLocation ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button
              onClick={isSharingLocation ? stopLocationSharing : startLocationSharing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isSharingLocation
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600">✓ Live tracking active</span> - Updates every 15 minutes
            </div>
          )}
        </div>
      )}

      {/* Parent View: Monitoring Cards with Navigation Trigger */}
      {isParent && childLocations && childLocations.length > 0 && (
        <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Monitoring {childLocations.length} Child(ren)
            </h3>
            {routeData && (
              <button
                onClick={handleClearRoute}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Route
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {childLocations.map((child, index) => {
              const isSelected = selectedChild === child.id;
              const isNavigatingToThis = activeDestination?.name === child.name;

              return (
                <div
                  key={child.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isNavigatingToThis
                      ? 'bg-blue-100/90 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 shadow-sm'
                      : isSelected
                      ? 'bg-white dark:bg-background border-primary/50'
                      : 'bg-white/90 dark:bg-background/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setSelectedChild(isSelected ? null : child.id)}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            child.status === 'safe'
                              ? '#10b981'
                              : child.status === 'warning'
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      />
                      <span className="text-sm font-semibold text-foreground">{child.name}</span>
                    </div>

                    {/* Quick Navigate Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChild(child.id);
                        handleCalculateRoute(
                          { lat: latitude, lng: longitude, label: address || 'Parent (You)' },
                          { lat: child.latitude, lng: child.longitude, label: child.name }
                        );
                      }}
                      disabled={isRoutingLoading || !child.latitude || !child.longitude}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isNavigatingToThis
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-600/10 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white'
                      } disabled:opacity-50`}
                      title="Calculate real road route to child"
                    >
                      {isRoutingLoading && activeDestination?.name === child.name ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Navigation className="w-3 h-3" />
                      )}
                      <span>{isNavigatingToThis ? 'Active Route' : 'Navigate'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pl-4.5">
                    <span>Last: {new Date(child.lastUpdate).toLocaleTimeString()}</span>
                    {child.address && (
                      <span className="truncate max-w-[140px]" title={child.address}>
                        {child.address}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className="rounded-2xl overflow-hidden shadow-depth border relative" style={{ height: '450px' }}>
        {/* Loading Overlay */}
        {isRoutingLoading && (
          <div className="absolute top-3 right-3 z-[1000] bg-background/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-medium text-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Calculating road route via OSRM...
          </div>
        )}

        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {!routeData && <RecenterMap latitude={latitude} longitude={longitude} />}
          {routeData && <FitRouteBounds coordinates={routeData.coordinates} />}
          <FocusMapLocation targetLocation={focusedStepLocation} />

          {/* OSRM Real Road Route Polyline */}
          {routeData && (
            <>
              {/* Outer soft glow layer */}
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: '#1d4ed8',
                  weight: 8,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner crisp navigation route line */}
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {/* Parent location marker - always show for parent view */}
          {isParent && latitude && longitude && (
            <Marker
              position={[latitude, longitude]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-4 border-white shadow-lg text-white font-bold text-sm">
                  P
                </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="font-bold text-foreground">Parent (You) - Start</div>
                  <div className="text-xs text-muted-foreground">{address || 'Your Current Location'}</div>
                  {accuracy && (
                    <div className="text-xs text-muted-foreground">Accuracy: &plusmn;{accuracy}m</div>
                  )}
                  {routeData && (
                    <div className="text-xs text-blue-600 font-semibold pt-1 border-t">
                      Route Start Point
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Main user marker - show for non-parents */}
          {!isParent && latitude && longitude && (
            <Marker position={[latitude, longitude]}>
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="font-bold text-foreground">{status || 'User'}</div>
                  <div className="text-xs text-muted-foreground">{address || 'Unknown location'}</div>
                  {accuracy && (
                    <div className="text-xs text-muted-foreground">Accuracy: &plusmn;{accuracy}m</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Child location markers for parent view */}
          {isParent &&
            childLocations &&
            childLocations.map((child, index) => (
              <React.Fragment key={child.id}>
                {child.latitude && child.longitude && (
                  <Marker
                    key={`current-${child.id}`}
                    position={[child.latitude, child.longitude]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-xs shadow-md border-2 border-white" style="background-color: ${getChildColor(
                        child,
                        index
                      )}">
                      ${child.name.charAt(0).toUpperCase()}
                    </div>`,
                      iconSize: [28, 28],
                      iconAnchor: [14, 14],
                    })}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-foreground">{child.name}</div>
                        <div className="text-xs">
                          Status:{' '}
                          <span
                            className={`font-semibold ${
                              child.status === 'safe'
                                ? 'text-emerald-600'
                                : child.status === 'warning'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {child.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Updated: {new Date(child.lastUpdate).toLocaleTimeString()}
                        </div>
                        {child.address && (
                          <div className="text-xs text-muted-foreground">Location: {child.address}</div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedChild(child.id);
                            handleCalculateRoute(
                              { lat: latitude, lng: longitude, label: address || 'Parent (You)' },
                              { lat: child.latitude, lng: child.longitude, label: child.name }
                            );
                          }}
                          className="w-full mt-2 py-1.5 px-3 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Get Road Route
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Last known location marker */}
                {child.lastKnownLocation &&
                  child.lastKnownLocation.latitude &&
                  child.lastKnownLocation.longitude && (
                    <Marker
                      key={`last-${child.id}`}
                      position={[
                        child.lastKnownLocation.latitude,
                        child.lastKnownLocation.longitude,
                      ]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div class="flex items-center justify-center w-6 h-6 rounded-full bg-gray-400 border-2 border-white text-white font-bold text-xs shadow">
                        ${child.name.charAt(0).toUpperCase()}
                      </div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                      })}
                    >
                      <Popup>
                        <div className="p-1 space-y-1">
                          <div className="font-bold text-foreground">{child.name} - Last Known</div>
                          <div className="text-xs text-muted-foreground">
                            Time: {new Date(child.lastKnownLocation.timestamp).toLocaleString()}
                          </div>
                          {child.lastKnownLocation.address && (
                            <div className="text-xs text-muted-foreground">
                              Location: {child.lastKnownLocation.address}
                            </div>
                          )}
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
              fillOpacity={0.15}
              color={status === 'safe' ? '#059669' : status === 'warning' ? '#d97706' : '#dc2626'}
            />
          )}
        </MapContainer>
      </div>

      {/* Routing Error Notice */}
      {routingError && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center justify-between text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{routingError}</span>
          </div>
          {activeDestination && (
            <button
              onClick={() =>
                handleCalculateRoute(
                  { lat: latitude, lng: longitude, label: address || 'Your Location' },
                  { lat: activeDestination.lat, lng: activeDestination.lng, label: activeDestination.name }
                )
              }
              className="px-2.5 py-1 bg-destructive text-destructive-foreground rounded-md text-xs font-semibold hover:bg-destructive/90 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      )}

      {/* Turn-by-Turn Navigation & Route Details Panel */}
      {routeData && (
        <div className="bg-card border rounded-2xl shadow-depth overflow-hidden transition-all">
          {/* Route Summary Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  Route to {routeData.destinationPoint.label || 'Destination'}
                </h3>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                From {routeData.startPoint.label || 'Start Location'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end font-extrabold text-lg">
                  <Milestone className="w-4 h-4 text-blue-200" />
                  {routeData.formattedDistance}
                </div>
                <div className="flex items-center gap-1 justify-end text-xs text-blue-100 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  ETA: {routeData.formattedDuration}
                </div>
              </div>

              <button
                onClick={handleClearRoute}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                title="Close Directions"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Turn-by-Turn Directions List */}
          <div className="p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-primary" />
              Turn-by-Turn Directions ({routeData.steps.length} steps)
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {routeData.steps.map((step, idx) => (
                <div
                  key={step.id}
                  onClick={() => setFocusedStepLocation(step.location)}
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary flex-shrink-0 mt-0.5">
                    {getManeuverIcon(step.type, step.modifier)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      <span className="font-semibold text-muted-foreground mr-1.5">{idx + 1}.</span>
                      {step.instruction}
                    </div>
                    {step.distance > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{step.formattedDistance}</span>
                        {step.duration > 0 && <span>&bull; {step.formattedDuration}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      {isParent && childLocations && childLocations.length > 0 && (
        <div className="p-3 bg-muted/40 border rounded-xl">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Map Legend</h4>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              <span>Safe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
              <span>Emergency</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-gray-400 rounded-full border border-white" />
              <span>Last Known Location</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
              <span>Parent Location (Start)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-1 bg-blue-600 rounded-full" />
              <span>Road Route (OSRM)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};