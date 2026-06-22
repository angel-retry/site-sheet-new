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
