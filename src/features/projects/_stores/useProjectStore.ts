import { create } from "zustand";
import { addProjectAction } from "../_actions/addProject";
import { getProjectsAction } from "../_actions/getProjects";
import type { AddProjectResult, Project, ProjectInput } from "../_types";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  isAdding: boolean;
  error: string | null;
  getProjects: () => Promise<void>;
  addProject: (data: ProjectInput) => Promise<AddProjectResult>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  isAdding: false,
  error: null,
  getProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getProjectsAction();
      set({ projects: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  addProject: async (projectData: ProjectInput) => {
    set({ isAdding: true });
    const res = await addProjectAction(projectData);

    if (res.success) {
      await get().getProjects();
    }

    set({ isAdding: false });
    return res;
  },
}));
