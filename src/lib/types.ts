
export type VerificationStatus = 'Verified' | 'Pending' | 'Rejected' | 'unverified';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'free';
export type PlanType = 'free' | 'elite' | 'elite_plus';

export interface UserSubscription {
  planId: PlanType;
  status: SubscriptionStatus;
  expiresAt: any;
  startedAt: any;
}

export interface UserUsage {
  newChatsUsed: number;
  likesUsed: number;
  mediaUsed: number;
  lastResetDate: string;
}

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
  subscription?: UserSubscription;
  usage?: UserUsage;
  superLikeBalance: number;
  spotlightExpiry?: any;
  incognitoMode: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  location?: {
    lat: number;
    lng: number;
  } | null;
  geohash?: string; // SCALABILITY: Added for high-fidelity discovery
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
  isDemoUser?: boolean;
  isSuperFunder?: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
  isMedia?: boolean;
  mediaUrl?: string;
  storagePath?: string;
  privacyMode?: boolean;
  viewMode?: "unlimited" | "one" | "two";
  viewCount?: Record<string, number>;
  expiresAt?: any;
  status?: 'sending' | 'sent' | 'failed';
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
  privacyEnabled?: boolean;
};

export type NotificationType = 'verification' | 'proximity' | 'message' | 'welcome' | 'subscription' | 'spotlight' | 'like' | 'super_like' | 'match' | 'super_fund';

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
  referenceId?: string;
};

export type InteractionType = 'like' | 'super_like';

export type LikeRecord = {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: InteractionType;
  createdAt: any;
  status: 'active' | 'deleted';
};

export type PurchaseItemType = 'Elite' | 'ElitePlus' | 'SuperLike' | 'Spotlight' | 'SuperFund';

export type Purchase = {
  id: string;
  uid: string;
  itemType: PurchaseItemType;
  amount: number;
  currency: string;
  timestamp: any;
  razorpayOrderId: string;
  status: 'Success' | 'Failed' | 'Pending';
};

export type SuperFund = {
  id: string;
  userId: string;
  displayName: string;
  amount: number;
  currency: string;
  isAnonymous: boolean;
  timestamp: any;
  status: 'verified' | 'pending';
};

export type ReportType = 'Harassment' | 'Spam' | 'Fake profile' | 'Scams' | 'Hate behavior' | 'Sexual exploitation' | 'Threats' | 'Inappropriate content' | 'Other';

export type Report = {
  id?: string;
  reporterId: string;
  targetId: string;
  reason: ReportType;
  description?: string;
  timestamp: any;
  status: 'Pending' | 'Reviewed' | 'Resolved';
};
