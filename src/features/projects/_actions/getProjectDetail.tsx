import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  LocationZone,
  PhotoItem,
  ProjectDetail,
  WorkItem,
} from "../_types";

export async function getProjectDetailAction(
  projectId: string,
): Promise<ProjectDetail> {
  try {
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      throw new Error("找不到專案!");
    }

    const projectData = projectSnap.data();

    console.log({ projectSnap });

    // 主文件取得
    const baseProject = {
      id: projectSnap.id,
      projectName: projectData.projectName || "",
      unit: projectData.unit || "",
      startDate: projectData.startDate || "",
      endDate: projectData.endDate || "",
      contractAmount: projectData.contractAmount || "",
    };

    // 撈取 locationZones 子集合
    const zonesColRef = collection(db, "projects", projectId, "locationZones");
    const zonesSnapshot = await getDocs(zonesColRef);

    const locationZones: LocationZone[] = await Promise.all(
      zonesSnapshot.docs.map(async (zoneDoc) => {
        const zoneId = zoneDoc.id;
        const zoneData = zoneDoc.data();

        const photosColRef = collection(
          db,
          "projects",
          projectId,
          "locationZones",
          zoneId,
          "photos",
        );
        const workItemsColRef = collection(
          db,
          "projects",
          projectId,
          "locationZones",
          zoneId,
          "workItems",
        );

        const [photosSnap, workItemsSnap] = await Promise.all([
          getDocs(photosColRef),
          getDocs(workItemsColRef),
        ]);

        // 整理 photos
        const photos: PhotoItem[] = photosSnap.docs.map((pDoc) => {
          const pData = pDoc.data();

          return {
            id: pDoc.id,
            url: pData.url || "",
            stage: pData.stage || "",
            timestamp: pData.timestamp || "",
            ...(pData.crop && { crop: pData.crop }),
          };
        });

        // 整理 workItems
        const workItems: WorkItem[] = workItemsSnap.docs.map((wDoc) => {
          const wData = wDoc.data();

          return {
            id: wDoc.id || "",
            itemNo: wData.itemNo || "",
            itemName: wData.itemName || "",
            unit: wData.unit || "",
            quantity: Number(wData.quantity) || 0,
            unitPrice: Number(wData.unitPrice) || 0,
            note: wData.note || "",
          };
        });

        // 回傳單一工區物件（對齊你的 LocationZone 介面）
        return {
          id: zoneId,
          locationName: zoneData.locationName || "",
          startDate: zoneData.startDate || "",
          endDate: zoneData.endDate || "",
          workItems,
          photos,
        };
      }),
    );

    return {
      ...baseProject,
      locationZones,
    };
  } catch (error) {
    console.error("Firebase Fetch Detail Error:", error);
    throw new Error("無法取得專案詳細工作台資料");
  }
}
