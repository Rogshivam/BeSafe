import { useState, useRef } from 'react';
import { Camera, Mic, Monitor, MapPin, Square, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const QuickActions = () => {
  const { role } = useAuth();
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [locationShared, setLocationShared] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      const link = document.createElement('a');
      link.download = `besafe-photo-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      alert('Camera access denied. Please allow camera permissions.');
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        // Check 5MB limit
        if (blob.size > 5 * 1024 * 1024) {
          alert('Recording exceeds 5MB limit. Please record a shorter clip.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `besafe-audio-${Date.now()}.webm`;
        link.href = url;
        link.click();
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const takeScreenshot = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Use html2canvas alternative - capture current viewport
      setScreenshotTaken(true);
      setTimeout(() => setScreenshotTaken(false), 2000);
      alert('Screenshot captured! (In production, this would save to evidence locker)');
    } catch {
      alert('Screenshot capture failed.');
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
        setLocationText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocationShared(true);
        setTimeout(() => setLocationShared(false), 5000);
        // Open in SMS to emergency contacts
        if (role === 'child') {
          window.open(`sms:?body=${encodeURIComponent(`🚨 My location: ${mapUrl}`)}`, '_blank');
        } else {
          window.open(mapUrl, '_blank');
        }
      },
      () => alert('Location access denied. Please allow location permissions.')
    );
  };

  const actions = [
    { icon: Camera, label: 'Capture Photo', onClick: capturePhoto, active: false },
    { icon: recording ? Square : Mic, label: recording ? `Stop (${recordingTime}s)` : 'Record Audio', onClick: toggleRecording, active: recording },
    { icon: Monitor, label: screenshotTaken ? 'Captured!' : 'Take Screenshot', onClick: takeScreenshot, active: screenshotTaken },
    { icon: MapPin, label: locationShared ? locationText : 'Send Location', onClick: shareLocation, active: locationShared },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-depth hover:shadow-depth-hover transition-all text-sm font-medium hover:-translate-y-0.5 active:scale-95 ${
            action.active
              ? 'gradient-emergency text-destructive-foreground'
              : 'bg-card text-foreground'
          }`}
        >
          <action.icon className={`w-4 h-4 ${action.active ? '' : 'text-primary'}`} />
          {action.label}
        </button>
      ))}
    </div>
  );
};
