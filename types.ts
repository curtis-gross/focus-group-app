export enum AppMode {
  // Existing Nike Modes
  HOME = 'HOME', // Use Home as the dashboard
  PDP_PERSONALIZATION = 'PDP_PERSONALIZATION',
  PDP_ENRICHMENT = 'PDP_ENRICHMENT',
  E_SPOTS = 'E_SPOTS',
  GEN_SITE = 'GEN_SITE',

  // Lowe's / Example Features
  AD_ANALYSIS = 'AD_ANALYSIS',
  AD_COMPARISON = 'AD_COMPARISON',
  INFLUENCER_ANALYSIS = 'INFLUENCER_ANALYSIS',
  AUDIENCE_CREATION = 'AUDIENCE_CREATION',
  SYNTHETIC_ANALYSIS = 'SYNTHETIC_ANALYSIS',
  AGENTSPACE = 'AGENTSPACE',
  LANDING_PAGE = 'LANDING_PAGE',
  PROJECT_HELPER = 'PROJECT_HELPER',
  TASK_LIST = 'TASK_LIST',

  // Target App Modes
  ROOM_DESIGNER = 'ROOM_DESIGNER',
  LIFESTYLE_GEN = 'LIFESTYLE_GEN',
  VIBE_MATCH = 'VIBE_MATCH',
  AUDIENCE_GEN = 'AUDIENCE_GEN',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  PRODUCT_VARIANT = 'PRODUCT_VARIANT',
  MARKETING_BRIEF = 'MARKETING_BRIEF',
  SYNTHETIC_CHAT = 'SYNTHETIC_CHAT',

  // New Modes
  CONCIERGE = 'CONCIERGE',
  PDP_HUB = 'PDP_HUB',
  MARKETING_HUB = 'MARKETING_HUB',
  SYNTHETIC_FOCUS_GROUP = 'SYNTHETIC_FOCUS_GROUP',
  MULTI_IMAGE = 'MULTI_IMAGE',
  CONTENT_VERSIONING = 'CONTENT_VERSIONING',
  FEASIBILITY_ANALYSIS = 'FEASIBILITY_ANALYSIS',
  ASSISTANT = 'ASSISTANT',
  SYNTHETIC_USERS = 'SYNTHETIC_USERS',
  COMPANY_CONTEXT = 'COMPANY_CONTEXT'
}

export interface FeasibilityReport {
  score: number;
  summary: string;
  risks: string[];
  opportunities: string[];
  tactical_improvements: Array<{
    area: string;
    suggestion: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}

export interface MarketingBriefData {
  title: string;
  timestamp: string;
  campaignGoal: string;
  productName: string;
  companyName: string;
  assumptions: {
    budget: string;
    timeline: string;
    primarySalesFocus: string;
    mitigationStrategy: string;
  };
  objective: {
    goal: { en: string; es: string };
    targetKpi: { en: string; es: string };
  };
  audiences: Array<{
    name: string;
    sourceSegment: string;
    ageRange: string;
    painPoints: string[];
    drivers: string[];
    messagingAngle: { en: string; es: string };
  }>;
  kpis: Array<{
    title: string;
    description: string;
  }>;
  valueProp: {
    main: { en: string; es: string };
    againstCompetitors: string;
    addressingTrends: string;
  };
  messaging: {
    primaryHook: { en: string; es: string };
    supporting1: { title: string; content: { en: string; es: string } };
    supporting2: { title: string; content: { en: string; es: string } };
  };
  channels: Array<{
    name: string;
    justification: string;
  }>;
  phases: Array<{
    title: string;
    dates: string;
    focus: string;
    goal: string;
  }>;
  campaignAssets?: MarketingAssets;
  campaignAssetsMap?: Record<string, MarketingAssets>;
}

export interface MarketingAssets {
  image: string | null;
  social: {
    caption: string;
    hashtags: string[];
  };
  search: {
    headline: string;
    description: string;
    url: string;
  };
  email: {
    subject: string;
    preheader: string;
    body: string;
  };
  youtube: {
    title: string;
    script: string;
  };
  website: {
    recommendations: Array<{
      name: string;
      price: string;
      image: string | null;
    }>;
  };
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  job_title: string;
  bio: string;
  income: string;
  lifestyle_tags: string[];
  pain_points: string[];
  goals: string[];
  imageUrl?: string;
}

export interface GeneratedImageResult {
  imageUrl: string | null;
  description: string;
  loading: boolean;
  error: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  tags: string[];
}

export interface VibeMatchResult {
  colors: string[];
  mood: string;
  suggestedProducts: Product[];
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  FRAMES_TO_VIDEO = 'FRAMES_TO_VIDEO',
  REFERENCES_TO_VIDEO = 'REFERENCES_TO_VIDEO',
  EXTEND_VIDEO = 'EXTEND_VIDEO'
}

export interface GenerateVideoParams {
  prompt?: string;
  model: string;
  resolution?: string;
  aspectRatio?: string;
  mode: GenerationMode;
  startFrame?: { base64: string; file: { type: string; name: string } };
  endFrame?: { base64: string; file: { type: string; name: string } };
  isLooping?: boolean;
  referenceImages?: { base64: string; file: { type: string; name: string } }[];
  styleImage?: { base64: string; file: { type: string; name: string } };
  inputVideoObject?: any;
  durationSeconds?: number;
  personGeneration?: string;
}

export interface MarketingAssets {
  image: string | null;
  social: { caption: string; hashtags: string[] };
  search: { headline: string; description: string; url: string };
  email: { subject: string; preheader: string; body: string };
  youtube: { title: string; script: string };
  website: { recommendations: Array<{ name: string, price: string, image: string | null }> };
}

export interface SimulationResult {
  personaId: string;
  personaName: string;
  briefMetrics: {
    interestScore: number;
    clarityScore: number;
    relevanceScore: number;
    feedback: string;
    negativeFeedback: string;
  };
  cart: {
    productName: string;
    purchased: boolean;
    reason: string;
  }[];
  emailEngagement: {
    subjectLine: string;
    opened: boolean;
    clicked: boolean;
  }[];
  messageReactions?: { // Restored to fix syntax error
    message: string;
    score: number;
    sentiment: string;
  }[];
}

export interface CreativeResult {
  personaId: string;
  personaName: string;
  visualAppeal: number;
  brandFit: number;
  stoppingPower: number;
  sentiment: string;
  feedback: string;
  conversionLikelihood: number; // 0-100
  suggestedProduct?: string;
  suggestedMessaging?: string;
  suggestedImage?: string;
  copyEdit?: string;
  audienceGroup?: string; // The creative variant/audience this result belongs to
}

export interface ABTestResult {
  personaId: string;
  personaName: string;
  rankings: {
    variantName: string;
    score: number;
    rationale: string;
  }[];
  selectedVariant: string;
  overallFeedback: string;
  sentiment: string;
}

export interface AggregatedSimulationResult {
  timestamp: string;
  results: SimulationResult[];
}

export interface AcquisitionResult {
  personaId: string;
  personaName: string;
  likelihoodToJoin: number; // 0-100
  perceivedValue: number; // 0-100
  barriers: string;
  feedback: string;
  winningOffer?: string; // Which offer tempted them the most
}

export type SavedSimulation =
  | {
    type: 'ACQUISITION_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: AcquisitionResult[];
    stats: any;
  }
  | {
    type: 'MEMBER_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: SimulationResult[];
    emailBodies?: { [key: string]: string };
  }
  | {
    type: 'CHAT_SESSION';
    id: string;
    name: string;
    timestamp: string;
    messages: { role: 'user' | 'persona'; content: string }[];
    personaId: string;
  }
  | {
    type: 'CREATIVE_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: CreativeResult[];
  }
  | {
    type: 'AB_TEST_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: ABTestResult[];
    variants: { region: string; image: string }[];
  }
  | {
    type: 'INTERVIEW_SESSION';
    id: string;
    name: string;
    timestamp: string;
    question: string;
    results: InterviewResult[];
  };

export interface InterviewResult {
  personaId: string;
  personaName: string;
  transcript: { role: 'interviewer' | 'interviewee'; content: string }[];
  summary: string;
  quote: string;
  sentiment: string;
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface AudienceSegment {
  name: string;
  personaName: string;
  bio: string;
  demographics: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface DetailedPersona {
  name: string;
  age: number;
  job_title: string;
  bio: string;
  income: string;
  net_worth: string;
  household_size: string;
  lifestyle_tags: string[];
  preferred_products: string[];
  pain_points: string[];
  goals: string[];
  charts: {
    brand_affinity: { labels: string[], data: number[] };
  };
}

export interface CombinedPersona extends AudienceSegment {
  id?: string;
  details?: DetailedPersona;
  score?: {
    propensity: number;
    value: number;
    reason: string;
  };
}

export interface CognitiveStyle {
  informationDensityPreference: string;
  primaryTrustSignal: string;
  decisionVelocity: string;
  riskTolerance: string;
}

export interface LifestyleFriction {
  dailyGrindContext: string;
  financialMindset: string;
  brandLoyaltyQuotient: string;
  householdPowerDynamic: string;
}

export interface DigitalFootprint {
  last3SearchQueries: string[];
  unsubscribeTrigger: string;
  platformEcosystem: string;
  recentBigLifeEvent: string;
}

export interface PsychographicFlavor {
  theOneLuxury: string;
  aspirationVsReality: string;
  socialCauseAlignment: string;
}

export interface SyntheticUserProfile extends CombinedPersona {
  baseAudienceName?: string;
  baseAudienceBio?: string;
  cognitiveStyle?: CognitiveStyle;
  lifestyleFriction?: LifestyleFriction;
  digitalFootprint?: DigitalFootprint;
  psychographicFlavor?: PsychographicFlavor;
}
