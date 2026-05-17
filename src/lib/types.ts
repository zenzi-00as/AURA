
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
  distance?: string; 
  distanceKm?: number;
  lastActive: any; 
  isOnline: boolean;
  photoUrl?: string;
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
  typing?: Record<string, boolean>;
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
