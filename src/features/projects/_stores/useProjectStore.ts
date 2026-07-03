import { create } from "zustand";
import { addProjectAction } from "../_actions/addProject";
import { getProjectDetailAction } from "../_actions/getProjectDetail";
import { getProjectsAction } from "../_actions/getProjects";
import { updatedProjectAction } from "../_actions/updateProjectAction";
import { updateProjectDetailAction } from "../_actions/updateProjectDetailAction";
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
  isUpdating: boolean;
  isUpdatingDetail: boolean;
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
  savePhotoItem: (
    locationId: string,
    photoId: string | null,
    photoData: {
      url: string;
      stage: "before" | "during" | "after";
      timestamp: string;
      crop: any;
    },
  ) => void;
  deletePhotoItem: (locationId: string, photoId: string) => void;
  addLocationDetail: () => void;
  deleteLocationDetail: (locationId: string) => void;
  updatedProject: (
    projectId: string,
    projectData: Partial<ProjectInput>,
  ) => Promise<any>;
  updatedProjectDetail: (projectId: string, fullData: any) => Promise<any>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  isDetailLoading: false,
  isAdding: false,
  isUpdating: false,
  isUpdatingDetail: false,
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

        // 原本已有的工項複製一份出來
        const updatedItems = [...zone.workItems];

        // 用 Map 記錄「目前已有」的 itemNo，方便快速比對
        const existingItemsMap = new Map(
          updatedItems.map((item) => [String(item.itemNo), item]),
        );

        // 遍歷新勾選的項目
        selectedItems?.forEach((item) => {
          const itemNoStr = String(item.itemNo);

          if (existingItemsMap.has(itemNoStr)) {
            return existingItemsMap.get(itemNoStr)!;
          }

          const newItem = {
            // 如果 item.id 已經是 2，且會跟其他地方衝突，建議使用結合 location 或是隨機碼的唯一 key
            id: item.id || `item_${itemNoStr}_${Date.now()}`,
            itemNo: item.itemNo,
            itemName: item.itemName,
            unit: item.unit,
            unitPrice: item.unitPrice,
            quantity: 0,
            note: "",
          };

          updatedItems.push(newItem);
          existingItemsMap.set(itemNoStr, newItem);
        });
        // 依照項目編號排序

        updatedItems.sort((a, b) => Number(a.itemNo) - Number(b.itemNo));

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
  savePhotoItem: (
    locationId: string,
    photoId: string | null,
    photoData: any,
  ) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZone = state.currentProject.locationZones?.map((zone) => {
        if (zone.id !== locationId) return zone;

        let updatedPhotos = [...(zone.photos || [])];

        if (photoId) {
          updatedPhotos = updatedPhotos.map((p) =>
            p.id === photoId ? { ...p, ...photoData } : p,
          );
        } else {
          const newPhoto = {
            id: `photo_${Date.now()}`,
            ...photoData,
          };

          updatedPhotos.push(newPhoto);
        }

        return { ...zone, photos: updatedPhotos };
      });

      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZone,
        },
      };
    });
  },
  deletePhotoItem: (locationId: string, photoId: string | null) => {
    set((state) => {
      if (!state.currentProject) return state;

      const updatedZones = state.currentProject.locationZones.map((zone) => {
        if (zone.id !== locationId) return zone;

        return {
          ...zone,
          photos: (zone.photos || []).filter((p) => p.id !== photoId),
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
  addLocationDetail: () => {
    set((state) => {
      if (!state.currentProject) return state;

      const currentZones = state.currentProject.locationZones ?? [];

      // 自動計算編號，例如：新施工區域 (1)、新施工區域 (2)
      const nextNumber = currentZones.length + 1;
      const defaultName = `新施工區域 (${nextNumber})`;

      const newLocation = {
        id: `location_${Date.now()}`,
        locationName: defaultName,
        startDate: "",
        endDate: "",
        workItems: [],
        photos: [],
      };

      return {
        currentProject: {
          ...state.currentProject,
          // 將新區域追加到陣列最後
          locationZones: [...currentZones, newLocation],
        },
      };
    });
  },
  updatedProject: async (
    projectId: string,
    projectData: Partial<ProjectInput>,
  ) => {
    set({ isUpdating: true, error: null });

    try {
      const res = await updatedProjectAction(projectId, projectData);

      if (res.success) {
        // 更新成功，刷新列表
        await get().getProjectDetail(projectId);

        // 同步更新當前點選的專案詳情（畫面上立即可見新專案名或工期）
        const { currentProject } = get();

        if (currentProject && currentProject.id === projectId) {
          set({
            currentProject: {
              ...currentProject,
              ...projectData,
            },
          });
        }
      } else {
        // 如果 Firebase 回傳 success: false (例如被 Rule 擋下)
        set({ error: res.message });
      }

      set({ isUpdating: false });
      return res;
    } catch (error: any) {
      set({ error: error.message, isUpdating: false });
      return { success: false, message: error.message };
    }
  },
  deleteLocationDetail: (locationId: string) => {
    set((state) => {
      if (!state.currentProject) return state;
      const updatedZones = state.currentProject.locationZones.filter(
        (zone) => zone.id !== locationId,
      );
      return {
        currentProject: {
          ...state.currentProject,
          locationZones: updatedZones,
        },
      };
    });
  },
  updatedProjectDetail: async (projectId: string, fullData: any) => {
    // 1. 開啟 Loading 鎖定 UI，並清空先前的錯誤訊息
    set({ isUpdatingDetail: true, error: null });

    try {
      // 2. 呼叫後端 Action 執行複雜的「Blob 轉 Cloudinary」與「Firestore 寫入」
      const res = await updateProjectDetailAction(projectId, fullData);

      if (res.success) {
        // 3. 後端更新成功後，最安全的做法是直接刷新全域的 projects 列表
        await get().getProjects();

        // 4. 同時，我們也需要重新整理全域的 currentProject 詳情
        // 為了確保前端跟資料庫的圖片網址（Cloudinary 網址）完全一致不破圖，
        // 這裡直接重新呼叫你現有的 getProjectDetail，讓它去後端拉取最新剛存好的資料
        await get().getProjectDetail(projectId);
      } else {
        // 如果後端回傳失敗（例如 Cloudinary 爆了或 Firebase 阻擋）
        set({ error: res.message });
      }

      set({ isUpdatingDetail: false });
      return res;
    } catch (error: any) {
      console.error("Zustand updatedProjectDetail 發生異常:", error);
      set({ error: error.message, isUpdatingDetail: false });
      return { success: false, message: error.message || "未知錯誤，同步失敗" };
    }
  },
}));
