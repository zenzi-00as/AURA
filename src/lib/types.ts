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

/**
 * Aura Centralized Settings Node
 */
export type UserSettings = {
  incognito: boolean;
  showOnlineStatus: boolean;
  language: string;
  currency: string;
  updatedAt?: any;
};

/**
 * Aura Notification Preference Node
 */
export type UserNotificationPreferences = {
  pushEnabled: boolean;
  newMatches: boolean;
  profileViews: boolean;
  verificationUpdates: boolean;
  membershipUpdates: boolean;
  paymentUpdates: boolean;
  spotlightUpdates: boolean;
  updatedAt?: any;
};

export type PresenceData = {
  isOnline: boolean;
  lastSeen: any;
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
  emailVerified?: boolean;
  profilePhoneNumber?: string;
  phoneNumber?: string; 
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
  plan?: PlanType;
  superLikeBalance: number;
  spotlightExpiry?: any;
  
  // NORMALIZED ARCHITECTURE
  settings?: UserSettings;
  notificationPreferences?: UserNotificationPreferences;
  presence?: PresenceData;

  // LEGACY COMPAT (To be phased out)
  incognitoMode?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  lastActive?: any;

  isSuspended: boolean;
  isAdmin: boolean;
  location?: {
    lat: number;
    lng: number;
  } | null;
  geohash?: string;
  distance?: string; 
  distanceKm?: number;
  photoUrl?: string;
  profilePhotos?: string[];
  onboardingCompleted: boolean;
  welcomeSent?: boolean;
  updatedAt?: any;
  isDemoUser?: boolean;
  isSuperFunder?: boolean;
  
  // Terms Acceptance Node
  termsAccepted?: boolean;
  termsAcceptedAt?: any;
  termsVersion?: string | null;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  expiresAt: any;
  seen: boolean;
  isMedia?: boolean;
  mediaUrl?: string;
  storagePath?: string;
  privacyMode?: boolean;
  viewMode?: "unlimited" | "one" | "two";
  viewCount?: Record<string, number>;
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
};

export type NotificationType = 
  | 'verification' 
  | 'proximity' 
  | 'message' 
  | 'welcome' 
  | 'subscription' 
  | 'spotlight' 
  | 'like' 
  | 'super_like' 
  | 'match' 
  | 'super_fund'
  | 'payment'
  | 'security';

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

export type Report = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  description?: string;
  timestamp: any;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  conversationId?: string;
};

export type BlockedUser = {
  id: string;
  uid: string;
  name: string;
  blockedAt: any;
  blockedBy: string;
};

export type FcmToken = {
  id: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: any;
  updatedAt: any;
  lastUsedAt: any;
};
