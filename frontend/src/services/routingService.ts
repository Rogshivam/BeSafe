export interface Coordinate {
  lat: number;
  lng: number;
  label?: string;
}

export interface NavigationStep {
  id: string;
  instruction: string;
  distance: number;
  formattedDistance: string;
  duration: number;
  formattedDuration: string;
  name: string;
  type: string;
  modifier?: string;
  location: [number, number]; // [lat, lng]
}

export interface RouteResult {
  coordinates: [number, number][]; // Leaflet format: [lat, lng]
  distance: number; // in meters
  formattedDistance: string;
  duration: number; // in seconds
  formattedDuration: string;
  steps: NavigationStep[];
  startPoint: Coordinate;
  destinationPoint: Coordinate;
}

export const formatDistance = (meters: number): string => {
  if (isNaN(meters) || meters <= 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
};

export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds <= 0) return '0 min';
  if (seconds < 60) {
    return '< 1 min';
  }
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
};

const getBearingDirection = (bearing: number): string => {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

const formatModifier = (modifier?: string): string => {
  if (!modifier) return '';
  switch (modifier) {
    case 'slight left':
      return 'slight left';
    case 'slight right':
      return 'slight right';
    case 'sharp left':
      return 'sharp left';
    case 'sharp right':
      return 'sharp right';
    case 'uturn':
      return 'U-turn';
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'straight':
      return 'straight';
    default:
      return modifier;
  }
};

export const buildStepInstruction = (step: any, index: number, totalSteps: number): string => {
  const maneuver = step.maneuver || {};
  const type = maneuver.type || '';
  const modifier = maneuver.modifier;
  const name = step.name ? `onto ${step.name}` : (step.ref ? `onto ${step.ref}` : '');
  const roadName = step.name || step.ref || '';

  if (index === 0 || type === 'depart') {
    const dir = maneuver.bearing_after !== undefined ? getBearingDirection(maneuver.bearing_after) : 'north';
    if (roadName) {
      return `Head ${dir} on ${roadName}`;
    }
    return `Head ${dir}`;
  }

  if (index === totalSteps - 1 || type === 'arrive') {
    return 'Arrive at your destination';
  }

  switch (type) {
    case 'turn':
      if (modifier === 'straight') {
        return roadName ? `Continue straight onto ${roadName}` : 'Continue straight';
      }
      return `Turn ${formatModifier(modifier)} ${name}`.trim();

    case 'new name':
    case 'continue':
      return roadName ? `Continue onto ${roadName}` : 'Continue straight';

    case 'merge':
      return `Merge ${formatModifier(modifier)} ${name}`.trim();

    case 'on ramp':
    case 'ramp':
      return `Take ramp ${formatModifier(modifier)} ${name}`.trim();

    case 'off ramp':
      return `Take exit ${formatModifier(modifier)} ${name}`.trim();

    case 'fork':
      return `Keep ${formatModifier(modifier)} at the fork ${name}`.trim();

    case 'end of road':
      return `At the end of the road, turn ${formatModifier(modifier)} ${name}`.trim();

    case 'roundabout':
    case 'rotary':
      const exit = maneuver.exit ? `take exit ${maneuver.exit}` : 'enter roundabout';
      return `At roundabout, ${exit} ${name}`.trim();

    case 'roundabout turn':
      return `At roundabout, turn ${formatModifier(modifier)} ${name}`.trim();

    case 'notification':
      return roadName ? `Follow ${roadName}` : 'Continue following route';

    default:
      if (modifier) {
        return `Turn ${formatModifier(modifier)} ${name}`.trim();
      }
      return roadName ? `Continue on ${roadName}` : 'Continue on route';
  }
};

export const fetchOSRMRoute = async (
  start: Coordinate,
  destination: Coordinate
): Promise<RouteResult> => {
  if (!start.lat || !start.lng || !destination.lat || !destination.lng) {
    throw new Error('Valid start and destination coordinates are required.');
  }

  // OSRM coordinates format: {lon},{lat};{lon},{lat}
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Routing service error: HTTP ${response.status} (${response.statusText})`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No road route found between the selected locations.');
  }

  const route = data.routes[0];
  const leg = route.legs && route.legs.length > 0 ? route.legs[0] : null;

  // Convert OSRM GeoJSON [lon, lat] coordinates to Leaflet [lat, lng]
  const leafletCoordinates: [number, number][] = (route.geometry?.coordinates || []).map(
    (coord: [number, number]) => [coord[1], coord[0]]
  );

  const rawSteps = leg?.steps || [];
  const steps: NavigationStep[] = rawSteps.map((step: any, idx: number) => {
    const stepLoc = step.maneuver?.location;
    const latLng: [number, number] = stepLoc ? [stepLoc[1], stepLoc[0]] : [start.lat, start.lng];
    return {
      id: `step-${idx}-${Date.now()}`,
      instruction: buildStepInstruction(step, idx, rawSteps.length),
      distance: step.distance || 0,
      formattedDistance: formatDistance(step.distance || 0),
      duration: step.duration || 0,
      formattedDuration: formatDuration(step.duration || 0),
      name: step.name || step.ref || '',
      type: step.maneuver?.type || '',
      modifier: step.maneuver?.modifier,
      location: latLng,
    };
  });

  return {
    coordinates: leafletCoordinates,
    distance: route.distance || 0,
    formattedDistance: formatDistance(route.distance || 0),
    duration: route.duration || 0,
    formattedDuration: formatDuration(route.duration || 0),
    steps,
    startPoint: start,
    destinationPoint: destination,
  };
};
