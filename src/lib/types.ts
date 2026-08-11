
export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected';
export type SubscriptionStatus = 'Active' | 'Inactive' | 'Expired';
export type PlanType = 'Free' | 'Elite';

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

export type VerificationData = {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  imagePath?: string;
  submittedAt?: any;
  reviewedAt?: any;
  rejectionReason?: string;
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
  verification?: VerificationData;
  subscriptionStatus?: SubscriptionStatus;
  plan: PlanType;
  subscriptionEndDate?: any;
  subscriptionPrice?: number;
  dailyChatCount: number;
  dailyMediaCount: number;
  lastResetDate?: string;
  superLikeBalance: number;
  spotlightExpiry?: any;
  incognitoMode: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  location?: {
    lat: number;
    lng: number;
  } | null;
  distance?: string; 
  distanceKm?: number;
  lastActive: any; 
  isOnline: boolean;
  photoUrl?: string;
  profilePhotos?: string[];
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
  isMedia?: boolean;
  mediaUrl?: string;
};

export type ChatRoom = {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: any;
  typing?: Record<string, boolean>;
  isSystem?: boolean;
  unreadCount?: Record<string, number>;
  autoDeleteEnabled?: boolean;
};

export type NotificationType = 'verification' | 'proximity' | 'message' | 'welcome' | 'subscription' | 'spotlight';

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

export type Purchase = {
  id: string;
  uid: string;
  itemType: 'Elite' | 'SuperLike' | 'Spotlight';
  amount: number;
  timestamp: any;
  razorpayOrderId: string;
  status: 'Success' | 'Failed' | 'Pending';
};

export type Report = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  timestamp: any;
  status: 'Pending' | 'Reviewed' | 'Resolved';
};
