export interface Project {
  id: string;
  unit: string;
  projectName: string;
  startDate: string;
  endDate: string;
  contractAmount: string;
}

export type ProjectInput = Omit<Project, "id">;

export interface AddProjectResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface ProjectDetail extends Project {
  locationZones: LocationZone[];
}

export type PhotoStage = "before" | "during" | "after";

export interface LocationZone {
  id: string;
  startDate: string;
  endDate: string;
  locationName: string;
  workItems: WorkItem[];
  photos: PhotoItem[];
}

export interface WorkItem {
  id: string;
  itemNo: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  note: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  timestamp: string;
  stage: PhotoStage;
  crop?: CropState;
}

export interface CropState {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DragState {
  x: number;
  y: number;
}
