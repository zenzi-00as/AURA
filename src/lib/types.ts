export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';

export type UserProfile = {
  uid: string;
  name: string;
  age: number;
  bio: string;
  gender: string;
  orientation: string;
  verificationStatus: VerificationStatus;
  distance: string; // Pre-calculated string like "350 meters away"
  distanceKm: number; // Numeric value for filtering
  lastActive: Date;
  online: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  seen: boolean;
};

export type ChatRoom = {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: Date;
  typingUser?: string;
};
