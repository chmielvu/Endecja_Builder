
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

// NEW: Image metadata for Visual Builder Mode
export interface NodeImage {
  dataUrl: string; // Base64 encoded image
  caption?: string; // Display caption
  credit?: string; // Source/photographer credit
  creditUrl?: string; // Link to source
  alt?: string; // Accessibility text
  isPrimary: boolean; // Primary thumbnail for node rendering
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
  
  // NEW: Visual Builder Mode attributes
  descriptionHtml?: string; // Rich text HTML from TipTap
  images?: NodeImage[]; // Image gallery
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
  
  // NEW: Visual Builder Mode attributes
  descriptionText?: string; // Short description for edges
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

// NEW: Export format for public graphs
export interface PublicGraphExport {
  version: string;
  title: string;
  description?: string;
  creator?: string;
  exportDate: string;
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      type: NodeType;
      descriptionHtml?: string;
      images?: NodeImage[];
      jurisdiction: Jurisdiction;
      timeRange: DateRange;
      position: { x: number; y: number };
      size: number;
      color: string;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      relationshipType: string;
      sign: number;
      descriptionText?: string;
      color?: string;
    }>;
  };
}

// NEW: Mode type for app state
export type AppMode = 'analysis' | 'builder';
