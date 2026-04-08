import { io, Socket } from 'socket.io-client';

// Socket.io service for real-time communication
class SocketService {
  private socket: Socket | null = null;
  private readonly SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  connect(userId: string) {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(this.SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('join-room', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emergency events
  onEmergencyAlert(callback: (data: any) => void) {
    this.socket?.on('emergency-alert', callback);
  }

  onEmergencyResponse(callback: (data: any) => void) {
    this.socket?.on('emergency-response', callback);
  }

  onEmergencyResolved(callback: (data: any) => void) {
    this.socket?.on('emergency-resolved', callback);
  }

  onEmergencyAlarm(callback: (data: any) => void) {
    this.socket?.on('emergency-alarm', callback);
  }

  // Location events
  onLocationUpdate(callback: (data: any) => void) {
    this.socket?.on('location-update', callback);
  }

  // Message events
  onNewMessage(callback: (data: any) => void) {
    this.socket?.on('new-message', callback);
  }

  // Emit events
  triggerEmergency(data: any) {
    this.socket?.emit('emergency-trigger', data);
  }

  sendLocationUpdate(data: any) {
    this.socket?.emit('location-update', data);
  }

  // Remove listeners
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;
