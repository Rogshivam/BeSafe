import mapPreview from '@/assets/map-preview.jpg';

interface MapWidgetProps {
  location?: string;
  status?: string;
}

export const MapWidget = ({ location = 'Madison Park', status = 'Active' }: MapWidgetProps) => (
  <div className="bg-background rounded-2xl shadow-depth overflow-hidden">
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h3 className="font-bold text-foreground">Child Location</h3>
      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Live</span>
    </div>
    <div className="relative h-64">
      <img src={mapPreview} alt="Map" className="w-full h-full object-cover" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center shadow-lg relative">
          <div className="w-3 h-3 bg-primary-foreground rounded-full" />
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-depth">
        <p className="text-xs text-muted-foreground">Location</p>
        <p className="text-sm font-bold text-foreground">{location}</p>
      </div>
      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-depth">
        <p className="text-xs text-muted-foreground">SafeZone</p>
        <p className="text-sm font-bold text-primary">{status}</p>
      </div>
    </div>
  </div>
);
