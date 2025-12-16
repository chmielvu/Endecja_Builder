export enum NodeType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  EVENT = 'event',
  PUBLICATION = 'publication',
  LOCATION = 'location',
  CONCEPT = 'concept',
  MYTH = 'myth'
}

export enum Jurisdiction {
  KONGRESOWKA = 'Kongresowka',
  GALICJA = 'Galicja',
  WIELKOPOLSKA = 'Wielkopolska',
  EMIGRACJA = 'Emigracja',
  OTHER = 'Other'
}

export enum Stance {
  ALLIANCE = 'alliance',
  HOSTILITY = 'hostility',
  AMBIVALENCE = 'ambivalence',
  MENTORSHIP = 'mentorship',
  RIVALRY = 'rivalry',
  DEPENDENCY = 'dependency',
  INFLUENCE = 'influence'
}

export interface DateRange {
  start: number;
  end: number;
  granularity?: 'day' | 'month' | 'year' | 'decade';
  circa?: boolean;
}

export interface Provenance {
  source: string;
  confidence: number; // 0.0 to 1.0
  method: 'archival' | 'inference' | 'interpolation'; // How data was obtained
  sourceClassification: 'primary' | 'secondary' | 'hostile' | 'myth' | 'ai_inference'; // Nature of the source itself
  model_tag?: string;
  timestamp: number;
  notes?: string;
}

export interface NodeAttributes {
  label: string;
  category: NodeType; // Renamed from type to avoid conflict with Sigma's reserved 'type'
  description?: string;
  jurisdiction: Jurisdiction;
  valid_time: DateRange;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  
  // Historical attributes
  financial_weight: number; // 0.0 - 1.0
  secrecy_level: number; // 1 - 5
  
  // ML attributes
  radicalization_vector?: Float32Array; // Embedding
  community?: number;
  betweenness?: number;
  
  provenance: Provenance[];
}

export interface EdgeAttributes {
  relationshipType: string; // Renamed from 'type' to avoid conflict with Sigma.js 'type' attribute
  weight: number;
  sign: 1 | -1 | 0; // +1 Alliance, -1 Hostility, 0 Ambivalent
  stance?: Stance;
  valid_time: DateRange;
  
  // Sigma.js rendering properties, often modified by reducers
  color?: string;
  size?: number;

  // Logic
  is_hypothetical: boolean;
  
  provenance: Provenance[];
}

export interface TimelineEvent {
  year: number;
  label: string;
  nodeId: string;
  description: string;
}

export interface SourceReference {
  id: string;
  type: string;
  title: string;
  author?: string;
  year?: number | string;
  description?: string;
  url?: string;
}

export interface GraphAttributes {
  metadata?: any;
  timeline?: TimelineEvent[];
  sources?: SourceReference[];
  myths?: any[];
}

export interface GraphData {
  nodes: { key: string; attributes: NodeAttributes }[];
  edges: { key: string; source: string; target: string; attributes: EdgeAttributes }[];
}
