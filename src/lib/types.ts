export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';
export type SubscriptionStatus = 'Active' | 'Inactive' | 'Expired';

export type UserNotificationSettings = {
  newMessages: boolean;
  groupMessages: boolean;
  mentions: boolean;
  likes: boolean;
  comments: boolean;
  newFollowers: boolean;
  friendRequests: boolean;
  calls: boolean;
  promotions: boolean;
  updates: boolean;
  securityAlerts: boolean;
  loginAlerts: boolean;
  sound: boolean;
  vibration: boolean;
  popupNotification: boolean;
  ledFlash: boolean;
  lockScreenPreview: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  dndSchedule: boolean;
  notificationPreview: boolean;
  muteIndividualChats: boolean;
  notificationTone: string;
  badgeCount: boolean;
};

export type UserProfile = {
  uid: string;
  name: string;
  email?: string;
  phoneNumber: string;
  age: number;
  bio: string;
  gender: string;
  orientation: string;
  interestedIn: string[];
  position?: "Top" | "Bottom" | "Versatile" | "Not specified";
  room?: "Yes" | "No";
  verificationStatus: VerificationStatus;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionEndDate?: any;
  subscriptionPrice?: number;
  location?: {
    lat: number;
    lng: number;
  } | null;
  distance?: string; 
  distanceKm?: number;
  lastActive: any; 
  isOnline: boolean;
  photoUrl?: string;
  onboardingCompleted: boolean;
  welcomeSent?: boolean;
  updatedAt?: any;
  notificationSettings?: UserNotificationSettings;
};

export type BlockedUser = {
  id: string;
  uid: string;
  name: string;
  blockedAt: any;
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
  isSystem?: boolean;
  unreadCount?: Record<string, number>;
};

export type NotificationType = 'verification' | 'proximity' | 'message' | 'welcome';

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  timestamp: any;
  read: boolean;
  roomId?: string;
  senderId?: string;
};