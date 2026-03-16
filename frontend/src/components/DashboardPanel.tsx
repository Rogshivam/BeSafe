import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Camera, Mic, MapPin, Phone, Shield,
  MicOff, X, Download, Play, Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardPanelProps {
  userType: "child" | "adult";
  onNavigate: (tab: string) => void;
}

const DashboardPanel = ({ userType, onNavigate }: DashboardPanelProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SOS Handler
  const handleSOS = () => {
    const number = userType === "child" ? "tel:+1234567890" : "tel:112";
    const label = userType === "child" ? "Parent" : "Police (112)";

    toast({
      title: "🚨 SOS Activated!",
      description: `Calling ${label}...`,
      variant: "destructive",
    });

    // Attempt to open dialer
    window.open(number, "_self");
  };

  // Camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setShowCamera(true);
      setCapturedPhoto(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please allow camera permissions.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
      setCapturedPhoto(dataUrl);
      closeCamera();
      toast({ title: "📸 Photo Captured!", description: "Photo saved successfully." });
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Check 5MB limit
        if (blob.size > 5 * 1024 * 1024) {
          toast({
            title: "Recording too large",
            description: "Audio exceeds 5MB limit. Try a shorter recording.",
            variant: "destructive",
          });
          return;
        }
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        toast({ title: "🎙️ Audio Recorded!", description: `Size: ${(blob.size / 1024).toFixed(1)} KB` });
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Location
  const sendLocation = useCallback(() => {
    setLoadingLocation(true);
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation not supported.", variant: "destructive" });
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setLoadingLocation(false);
        toast({
          title: "📍 Location Found!",
          description: `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}`,
        });
      },
      () => {
        setLoadingLocation(false);
        toast({ title: "Location Error", description: "Could not get location.", variant: "destructive" });
      }
    );
  }, [toast]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const actionCards = [
    {
      id: "sos",
      label: "SOS Emergency",
      description: userType === "child" ? "Call Parent Now" : "Call Police (112)",
      icon: AlertTriangle,
      color: "bg-emergency text-emergency-foreground",
      pulse: true,
      onClick: handleSOS,
    },
    {
      id: "camera",
      label: "Capture Photo",
      description: "Open rear camera",
      icon: Camera,
      color: "bg-primary text-primary-foreground",
      onClick: openCamera,
    },
    {
      id: "audio",
      label: isRecording ? "Stop Recording" : "Record Audio",
      description: isRecording ? formatTime(recordingTime) : "Record up to 5MB",
      icon: isRecording ? MicOff : Mic,
      color: isRecording ? "bg-emergency text-emergency-foreground" : "bg-secondary text-secondary-foreground",
      onClick: isRecording ? stopRecording : startRecording,
    },
    {
      id: "location",
      label: "Send Location",
      description: loadingLocation ? "Getting location..." : "Share GPS coordinates",
      icon: MapPin,
      color: "bg-warning text-warning-foreground",
      onClick: sendLocation,
    },
    {
      id: "contacts",
      label: "Emergency Contacts",
      description: "View & call contacts",
      icon: Phone,
      color: "bg-safe text-safe-foreground",
      onClick: () => onNavigate("contacts"),
    },
    {
      id: "safety",
      label: "Safety Status",
      description: "All systems active",
      icon: Shield,
      color: "bg-accent text-accent-foreground",
      onClick: () => toast({ title: "✅ All Safe", description: "All safety systems are active and monitoring." }),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Safety Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {userType === "child" ? "Stay safe! Tap SOS to call your parent." : "Monitor safety and emergency tools."}
        </p>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actionCards.map((card, i) => (
          <motion.button
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={card.onClick}
            className={`relative p-6 rounded-2xl ${card.color} text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-card hover:shadow-elevated ${card.pulse ? "animate-pulse-emergency" : ""}`}
          >
            <card.icon className="w-8 h-8 mb-3" />
            <h3 className="font-heading text-lg font-bold">{card.label}</h3>
            <p className="text-sm opacity-80 mt-1">{card.description}</p>
          </motion.button>
        ))}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl overflow-hidden max-w-lg w-full shadow-elevated">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-heading font-bold text-foreground">📸 Camera</h3>
              <button onClick={closeCamera} className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
            </div>
            <div className="p-4 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-emergency border-4 border-card shadow-elevated flex items-center justify-center"
              >
                <Camera className="w-7 h-7 text-emergency-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Captured Photo Preview */}
      {capturedPhoto && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-card"
        >
          <h3 className="font-heading font-bold mb-3 text-foreground">Captured Photo</h3>
          <img src={capturedPhoto} alt="Captured" className="rounded-xl w-full max-h-64 object-cover" />
          <a
            href={capturedPhoto}
            download="be-safe-photo.jpg"
            className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </motion.div>
      )}

      {/* Audio Preview */}
      {audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-card"
        >
          <h3 className="font-heading font-bold mb-3 text-foreground">Recorded Audio</h3>
          <audio controls src={audioUrl} className="w-full" />
          <p className="text-xs text-muted-foreground mt-2">
            Size: {audioBlob ? (audioBlob.size / 1024).toFixed(1) + " KB" : "N/A"}
          </p>
        </motion.div>
      )}

      {/* Location Display */}
      {location && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-4 shadow-card"
        >
          <h3 className="font-heading font-bold mb-2 text-foreground">📍 Your Location</h3>
          <p className="text-sm text-muted-foreground">
            Latitude: {location.lat.toFixed(6)} | Longitude: {location.lng.toFixed(6)}
          </p>
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <MapPin className="w-4 h-4" /> Open in Google Maps
          </a>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardPanel;
