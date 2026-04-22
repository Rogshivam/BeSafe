import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { requestManager, debouncedRequest, cachedRequest, freshRequest } from '../utils/requestManager';

// API base URL - change this to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced request function with caching and retry logic
const enhancedRequest = async <T>(
  url: string,
  options: RequestInit = {},
  useCache: boolean = true,
  debounceKey?: string
): Promise<T> => {
  const token = localStorage.getItem('token');
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const fullUrl = `${API_BASE_URL}${url}`;

  if (debounceKey) {
    const debouncedFn = requestManager.debounce(debounceKey, () => 
      requestManager.request<T>(fullUrl, enhancedOptions), 300
    );
    return await debouncedFn();
  }

  if (useCache) {
    return await requestManager.request<T>(fullUrl, enhancedOptions, true, true);
  }

  return await requestManager.request<T>(fullUrl, enhancedOptions, false, true);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: 'Individual' | 'Member' | 'Adult' | 'Parent' | 'Child';
  age?: number;
  status: 'Safe' | 'Alert' | 'Emergency';
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  };
  emergencyContacts?: EmergencyContact[];
  emergencySettings?: {
    voiceDetectionEnabled: boolean;
    gestureDetectionEnabled: boolean;
    autoTriggerEnabled: boolean;
    panicWord: string;
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  profileImage?: string;
  lastActive?: string;
}

export interface EmergencyContact {
  // memberId: string;
  memberId: {
    name: string;
    phone?: string;
    email?: string;
  };
  memberName?: string;
  relation: 'Parent' | 'Friend' | 'Guardian' | 'Spouse' | 'Sibling' | 'Other';
  priority: 'High' | 'Medium' | 'Low';
  isEmergencyContact: boolean;
}

export interface Emergency {
  id: string;
  individualId: string;
  individualName?: string;
  triggeredBy: 'Manual' | 'Voice' | 'Gesture' | 'Auto' | 'Location';
  status: 'Active' | 'Resolved' | 'False Alarm';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
  };
  message?: string;
  audioRecording?: string;
  image?: string;
  notifiedMembers?: Array<{
    memberId: {
      name: string;
      phone?: string;
      email?: string;
    };
    memberName?: string;
    notifiedAt: string;
    response: 'Pending' | 'Help' | 'Ignore';
    respondedAt?: string;
  }>;
  responders?: Array<{
    memberId: {
      name: string;
      phone?: string;
      email?: string;
    };
    memberName?: string;
    joinedAt: string;
    status: 'On the way' | 'Arrived' | 'Left';
  }>;
  timeline?: Array<{
    action: string;
    timestamp: string;
    userId?: string;
    userName?: string;
    details?: string;
  }>;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  receiverId: string;
  receiverName?: string;
  emergencyId?: string;
  messageType: 'Text' | 'Image' | 'Audio' | 'Location' | 'System';
  content: string;
  mediaUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isRead: boolean;
  readAt?: string;
  delivered: boolean;
  deliveredAt?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  timestamp: string;
}

// Auth API
export const authAPI = {
  register: async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    userType: 'Individual' | 'Member' | 'Adult' | 'Parent' | 'Child';
    age?: number;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getCurrentUser: async (): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData: Partial<User>) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwords: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.put('/auth/change-password', passwords);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  searchUsers: async (query: string, userType?: 'Individual' | 'Member' | 'Adult' | 'Parent' | 'Child') => {
    const params = new URLSearchParams({ query });
    if (userType) params.append('userType', userType);
    const response = await api.get(`/users/search?${params}`);
    return response.data;
  },

  getEmergencyContacts: async (): Promise<{ success: boolean; data: { emergencyContacts: EmergencyContact[] } }> => {
    const response = await api.get('/users/emergency-contacts');
    return response.data;
  },

  addEmergencyContact: async (contactData: {
    // memberId: string;
    memberId: {
      name: string;
      phone?: string;
      email?: string;
    };
    relation: string;
    priority: string;
  }) => {
    const response = await api.post('/users/emergency-contacts', contactData);
    return response.data;
  },

  updateEmergencyContact: async (contactId: string, contactData: {
    relation?: string;
    priority?: string;
  }) => {
    const response = await api.put(`/users/emergency-contacts/${contactId}`, contactData);
    return response.data;
  },

  removeEmergencyContact: async (contactId: string) => {
    const response = await api.delete(`/users/emergency-contacts/${contactId}`);
    return response.data;
  },

  getUserProfile: async (userId: string): Promise<{ success: boolean; data: { user: User } }> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateStatus: async (status: 'Safe' | 'Alert' | 'Emergency') => {
    const response = await api.put('/users/status', { status });
    return response.data;
  },
};

// Emergency API
export const emergencyAPI = {
  triggerEmergency: async (emergencyData: {
    triggeredBy: string;
    latitude: number;
    longitude: number;
    severity?: string;
    message?: string;
    title?: string;
    description?: string;
    address?: string;
    accuracy?: number;
    notifyViaEmail?: boolean; // ADD THIS
    emailRecipients?: string[]; // ADD THIS
  }, files?: { image?: File; audio?: File }) => {
    const formData = new FormData();
    Object.entries(emergencyData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    if (files?.image) {
      formData.append('image', files.image);
    }
    if (files?.audio) {
      formData.append('audio', files.audio);
    }

    try {
      const response = await api.post('/emergency/trigger', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('SOS trigger error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many SOS requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while triggering SOS. Please try again.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid SOS request data.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to trigger SOS. Please try again.');
      }
    }
  },

  getActiveEmergencies: async (): Promise<{ success: boolean; data: { emergencies: Emergency[] } }> => {
    return await enhancedRequest('/emergency/active', {}, true, 'active-emergencies');
  },

  respondToEmergency: async (emergencyId: string, response: 'Help' | 'Ignore') => {
    return await enhancedRequest(`/emergency/${emergencyId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response })
    }, false);
  },

  getEmergencyDetails: async (emergencyId: string): Promise<{ success: boolean; data: { emergency: Emergency } }> => {
    return await enhancedRequest(`/emergency/${emergencyId}`, {}, true);
  },

  // Universal SOS notification - works for all user types
  sendEmergencyNotification: async (notificationData: {
    childName?: string;
    childLocation: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    message?: string;
    severity?: string;
  }) => {
    const response = await api.post('/emergency/notify-parents', notificationData);
    return response.data;
  },

  // Legacy email notification (kept for compatibility)
  sendEmergencyEmail: async (emailData: {
    childName?: string;
    childLocation: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    message?: string;
    severity?: string;
  }) => {
    const response = await api.post('/emergency/notify-parents', emailData);
    return response.data;
  },

  resolveEmergency: async (emergencyId: string, resolutionNotes?: string) => {
    const response = await api.post(`/emergency/${emergencyId}/resolve`, { resolutionNotes });
    return response.data;
  },

  getEmergencyHistory: async (): Promise<{ success: boolean; data: { emergencies: Emergency[] } }> => {
    return await enhancedRequest('/emergency/history/me', {}, true, 'emergency-history');
  },
  updateEmergency: async (id: string, formData: FormData) => {
    const response = await api.put(`/emergency/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  updateEmergencyStatus: async (id: string, status: string) => {
    const response = await api.put(`/emergency/${id}/status`, {
      status
    });
    return response.data;
  },

  getChildren: async () => {
    const response = await api.get('/emergency/children');
    return response.data;
  },

  getChildIncidents: async (childId: string) => {
    const response = await api.get(`/emergency/children/${childId}`);
    return response.data;
  },
};

// Evidence API
export const evidenceAPI = {
  getAll: async () => {
    try {
      const res = await api.get('/evidence');
      return res.data;
    } catch (error: any) {
      console.error('Get evidence error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while fetching evidence. Please try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch evidence. Please try again.');
      }
    }
  },

  uploadPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post('/evidence/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadAudio: async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    const res = await api.post('/evidence/upload/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadScreenshot: async (file: File) => {
    const formData = new FormData();
    formData.append('screenshot', file);
    const res = await api.post('/evidence/upload/screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  saveLocation: async (locationData: { latitude: number; longitude: number; address?: string }) => {
    const res = await api.post('/evidence/save/location', locationData);
    return res.data;
  },

  getChildren: async () => {
    try {
      const res = await api.get('/evidence/children');
      return res.data;
    } catch (error: any) {
      console.error('Get children error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while fetching children. Please try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch children. Please try again.');
      }
    }
  },

  getChildEvidence: async (childId: string) => {
    try {
      const res = await api.get(`/evidence/children/${childId}`);
      return res.data;
    } catch (error: any) {
      console.error('Get child evidence error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while fetching child evidence. Please try again.');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized. Please login again.');
      } else if (error.response?.status === 404) {
        throw new Error('Child not found. Please check the child ID.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch child evidence. Please try again.');
      }
    }
  },
};

// Location API
export const locationAPI = {
  // updateLocation: async (locationData: {
  //   latitude: number;
  //   longitude: number;
  //   accuracy?: number;
  //   address?: string;
  // }) => {
  //   const response = await api.post('/location/update', locationData);
  //   return response.data;
  // },

  // getCurrentLocation: async (userId: string): Promise<{ success: boolean; data: { location: Location; status: string; lastActive: string } }> => {
  //   const response = await api.get(`/location/${userId}/current`);
  //   return response.data;
  // },
getCurrentLocation: async (userId: string) => {
  const response = await api.get(`/location/${userId}/current`);
  return response.data;
},
  getLocationHistory: async (userId: string, minutes?: number): Promise<{ success: boolean; data: { locationHistory: Location[]; timeRange: string; totalPoints: number } }> => {
    const params = minutes ? `?minutes=${minutes}` : '';
    const response = await api.get(`/location/${userId}/history${params}`);
    return response.data;
  },

  getNearbyUsers: async (latitude: number, longitude: number, radius?: number) => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: (radius || 1000).toString(),
    });
    const response = await api.get(`/location/nearby?${params}`);
    return response.data;
  },

  updateLocation: async (locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    status?: string;
    timestamp?: string;
  }) => {
    try {
      const response = await api.post('/location/update', locationData);
      return response.data;
    } catch (error: any) {
      console.error('Location update error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many location updates. Please slow down.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while updating location. Please try again.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid location data.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to update location. Please try again.');
      }
    }
  },

  getLocationStats: async (userId: string, days?: number) => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get(`/location/${userId}/stats${params}`);
    return response.data;
  },

  updateSharingPreferences: async (preferences: {
    shareWithEmergencyContacts?: boolean;
    shareDuringEmergency?: boolean;
    shareLocationHistory?: boolean;
  }) => {
    const response = await api.put('/location/sharing-preferences', preferences);
    return response.data;
  },
  startTemporarySharing: async () => {
  const response = await api.post('/location/share-temporary');
  return response.data;
},
// stopSharing: async () => {
//   const response = await api.put('/location/sharing-preferences', {
//     shareWithEmergencyContacts: false,
//     shareDuringEmergency: false
//   });
//   return response.data;
// },
stopSharing: async () => {
  const res = await api.post('/location/stop-sharing');
  return res.data;
},
};

// Relationship API
export const relationshipAPI = {
  // Direct SOS notification via relationships API (working alternative)
  sendSOSNotification: async (notificationData: {
    childName?: string;
    childLocation: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    message?: string;
    severity?: string;
  }) => {
    const response = await api.post('/relationships/send-sos-notification', notificationData);
    return response.data;
  },

  sendRelationshipRequest: async (data: { targetUserId: string; relationshipType: string; requestMessage?: string; permissions?: any }) => {
    try {
      const response = await api.post('/relationships/request', data);
      return response.data;
    } catch (error: any) {
      console.error('Relationship request error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many relationship requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while sending relationship request. Please try again.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid relationship request data.');
      } else if (error.response?.status === 404) {
        throw new Error('Target user not found. Please check the user ID.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to send relationship request. Please try again.');
      }
    }
  },

  getPendingRelationships: async () => {
    const response = await api.get('/relationships/pending');
    return response.data;
  },

  acceptRelationship: async (relationshipId: string, responseMessage?: string) => {
    const response = await api.post(`/relationships/${relationshipId}/accept`, { responseMessage });
    return response.data;
  },

  rejectRelationship: async (relationshipId: string, responseMessage?: string) => {
    const response = await api.post(`/relationships/${relationshipId}/reject`, { responseMessage });
    return response.data;
  },

  getActiveRelationships: async () => {
    const response = await api.get('/relationships/active');
    return response.data;
  },

  terminateRelationship: async (relationshipId: string, reason?: string) => {
    try {
      console.log('API: Calling terminateRelationship with relationshipId:', relationshipId);
      console.log('API: Full URL:', `/relationships/${relationshipId}/terminate`);
      console.log('API: Reason:', reason);
      
      const response = await api.delete(`/relationships/${relationshipId}/terminate`, { 
        data: { reason } 
      });
      
      console.log('API: Termination response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Terminate relationship error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait before trying again.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error while terminating relationship. Please try again.');
      } else if (error.response?.status === 403) {
        throw new Error('Not authorized to terminate this relationship.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid termination request.');
      } else if (error.response?.status === 404) {
        throw new Error('Relationship not found. Please check the relationship ID.');
      } else if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'Failed to terminate relationship. Please try again.');
      }
    }
  },

  getChildLocations: async () => {
    const response = await api.get('/relationships/child-locations');
    return response.data;
  },

  getSentRelationships: async () => {
    const response = await api.get('/relationships/sent');
    return response.data;
  },

  updateRelationshipPermissions: async (relationshipId: string, permissions: any) => {
    const response = await api.put(`/relationships/${relationshipId}/permissions`, { permissions });
    return response.data;
  },
};

export const communicationAPI = {
  sendMessage: async (messageData: {
    receiverId: string;
    messageType?: string;
    content?: string;
    priority?: string;
    emergencyId?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }, file?: File) => {
    const formData = new FormData();
    Object.entries(messageData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    if (file) {
      formData.append('media', file);
    }

    const response = await api.post('/communication/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getConversation: async (userId: string, limit?: number, page?: number): Promise<{ success: boolean; data: { messages: Message[]; otherUser: User; unreadCount: number } }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (page) params.append('page', page.toString());

    const response = await api.get(`/communication/conversation/${userId}?${params}`);
    return response.data;
  },

  getEmergencyMessages: async (emergencyId: string): Promise<{ success: boolean; data: { messages: Message[]; unreadCount: number; emergency: any } }> => {
    const response = await api.get(`/communication/emergency/${emergencyId}`);
    return response.data;
  },

  getUnreadMessages: async (): Promise<{ success: boolean; data: { messages: Message[]; count: number } }> => {
    const response = await api.get('/communication/unread');
    return response.data;
  },

  markAsRead: async (messageId: string) => {
    const response = await api.put(`/communication/${messageId}/read`);
    return response.data;
  },

  triggerAlarm: async (message?: string) => {
    const response = await api.post('/communication/trigger-alarm', { message });
    return response.data;
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/communication/${messageId}`);
    return response.data;
  },
};

// Utility functions
export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export default api;
