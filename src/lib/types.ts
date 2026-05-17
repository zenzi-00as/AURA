export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';

export type UserProfile = {
  uid: string;
  name: string;
  age: number;
  bio: string;
  gender: string;
  orientation: string;
  verificationStatus: VerificationStatus;
  location?: {
    lat: number;
    lng: number;
  } | null;
  distance?: string; // Pre-calculated string like "350 meters away"
  distanceKm?: number; // Numeric value for filtering
  lastActive: any; // Firestore Timestamp
  isOnline: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
};

export type ChatRoom = {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: any;
  typingUser?: string;
};

export type NotificationType = 'verification' | 'proximity' | 'message';

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  timestamp: any;
  read: boolean;
};
