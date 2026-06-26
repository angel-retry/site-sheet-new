import { create } from "zustand";
import { addProjectAction } from "../_actions/addProject";
import { getProjectDetailAction } from "../_actions/getProjectDetail";
import { getProjectsAction } from "../_actions/getProjects";
import type {
  AddProjectResult,
  Project,
  ProjectDetail,
  ProjectInput,
} from "../_types";

interface ProjectState {
  projects: Project[];
  currentProject: ProjectDetail | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  isAdding: boolean;
  error: string | null;
  getProjects: () => Promise<void>;
  addProject: (data: ProjectInput) => Promise<AddProjectResult>;
  getProjectDetail: (projectId: string) => Promise<void>;
  updateLocationDetail: (
    locationId: string,
    fields: { locationName?: string; startDate?: string; endDate?: string },
  ) => void;
  updatedWorkItem: (
    locationId: string,
    itemNo: string,
    fields: { quantity?: number; note?: string },
  ) => void;
  deletedWorkItem: (locationId: string, itemNo: string) => void;
  addWorkItems: (locationId: string, selectedItems: any[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  isDetailLoading: false,
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
  getProjectDetail: async (projectId: string) => {
    // 先取得目前的 projects
    const { projects } = get();

    const localProject = projects.find((p) => p.id === projectId);

    if (localProject) {
      set({
        currentProject: {
          ...localProject,
          locationZones:
            get().currentProject?.id === projectId
              ? (get().currentProject?.locationZones ?? [])
              : [],
        },
        isDetailLoading: false,
        error: null,
      });
    } else {
      // 如果本地完全沒資料（例如：使用者直接貼網址進入、或重新整理 F5）
      set({ currentProject: null, isDetailLoading: true, error: null });
    }

    try {
      const detailData = await getProjectDetailAction(projectId);

      set({
        currentProject: detailData,
        isDetailLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isDetailLoading: false,
      });
    }
  },
  updateLocationDetail: (
    locationId: string,
    fields: { locationName?: string; startDate?: string; endDate?: string },
  ) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZones = state.currentProject.locationZones.map((zone) =>
        zone.id === locationId ? { ...zone, ...fields } : zone,
      );

      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZones,
        },
      };
    });
  },
  updatedWorkItem: (
    locationId,
    itemNo,
    fields: { quantity?: number; note?: string },
  ) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZones = state.currentProject.locationZones.map((zone) => {
        if (zone.id !== locationId) return zone;

        const updatedItems = zone.workItems.map((item) =>
          item.itemNo === itemNo ? { ...item, ...fields } : item,
        );

        return { ...zone, workItems: updatedItems };
      });

      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZones,
        },
      };
    });
  },
  deletedWorkItem: (locationId: string, itemNo: string) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZones = state.currentProject.locationZones.map((zone) => {
        if (zone.id !== locationId) return zone;

        return {
          ...zone,
          workItems: zone.workItems.filter((item) => item.itemNo !== itemNo),
        };
      });

      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZones,
        },
      };
    });
  },
  addWorkItems: (locationId: string, selectedItems: any[]) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZones = state.currentProject.locationZones.map((zone) => {
        if (zone.id !== locationId) return zone;

        const existingItemsMap = new Map(
          zone.workItems.map((item) => [String(item.itemNo), item]),
        );

        const finalItems = selectedItems.map((item) => {
          const itemNoStr = String(item.itemNo);

          if (existingItemsMap.has(itemNoStr)) {
            return existingItemsMap.get(itemNoStr)!;
          }

          return {
            id: item.id || String(item.itemNo),
            itemNo: item.itemNo,
            itemName: item.itemName,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: 0,
            note: "",
          };
        });

        finalItems.sort((a, b) => Number(a.itemNo) - Number(b.itemNo));

        return { ...zone, workItems: finalItems };
      });

      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZones,
        },
      };
    });
  },
}));
