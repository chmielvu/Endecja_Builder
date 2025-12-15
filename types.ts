export enum NodeType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  EVENT = 'event',
  PUBLICATION = 'publication',
  LOCATION = 'location'
}

export enum Jurisdiction {
  KONGRESOWKA = 'Kongresowka',
  GALICJA = 'Galicja',
  WIELKOPOLSKA = 'Wielkopolska',
  EMIGRACJA = 'Emigracja',
  OTHER = 'Other'
}

export interface DateRange {
  start: number;
  end: number;
}

export interface Provenance {
  source: string;
  confidence: number; // 0.0 to 1.0
  method: 'archival' | 'inference' | 'interpolation';
  model_tag?: string;
  timestamp: number;
}

export interface NodeAttributes {
  label: string;
  type: NodeType;
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
  
  provenance: Provenance;
}

export interface EdgeAttributes {
  type: string;
  weight: number;
  sign: 1 | -1 | 0; // +1 Alliance, -1 Hostility, 0 Ambivalent
  valid_time: DateRange;
  
  // Logic
  is_hypothetical: boolean;
  
  provenance: Provenance;
}

export interface GraphData {
  nodes: { key: string; attributes: NodeAttributes }[];
  edges: { key: string; source: string; target: string; attributes: EdgeAttributes }[];
}