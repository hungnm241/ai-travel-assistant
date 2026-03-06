export interface TravelPlan {
  trip: {
    destination: string;
    country?: string;
    days: number;
    budget?: {
      currency: string;
      total: number;
    };
    preferences?: {
      food?: string[];
      activities?: string[];
    };
  };
  itinerary: Array<{
    day: number;
    title: string;
    morning?: {
      activities: PlanActivity[];
    };
    afternoon?: {
      activities: PlanActivity[];
    };
    evening?: {
      activities: PlanActivity[];
    };
    hotel?: {
      name: string;
      address?: string;
      price_per_night?: number;
    };
    meals?: Array<{
      name: string;
      address?: string;
      type?: string;
    }>;
  }>;
}

export interface PlanActivity {
  name: string;
  location?: string;
  type?: string;
  estimated_cost?: number;
}

export interface IntentAnalysisResult {
  needsMoreInfo: boolean;
  missingFields?: string[];
  followupQuestion?: string;
  readyForPlan?: boolean;
  normalizedIntent?: Record<string, any>;
}

export interface DestinationValidationResult {
  isValid: boolean;
  correctedDestination?: string | null;
  messageForUser: string;
}

