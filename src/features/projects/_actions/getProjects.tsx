"use server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Project } from "../_types";

export async function getProjectsAction(): Promise<Project[]> {
  try {
    const projectsCol = collection(db, "projects");
    const snapshot = await getDocs(projectsCol);

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      // 在這裡將非 JSON 物件轉換為純值
      return {
        id: doc.id,
        projectName: data.projectName || "",
        unit: data.unit || "",
        startDate: data.startDate?.toDate
          ? data.startDate.toDate().toISOString().split("T")[0]
          : data.startDate,
        endDate: data.endDate?.toDate
          ? data.endDate.toDate().toISOString().split("T")[0]
          : data.endDate,
        contractAmount: data.contractAmount || 0,
        // 如果還有其他欄位，請一併處理
      } as Project;
    });
  } catch (error) {
    console.error("Firebase Fetch Error:", error);
    throw new Error("無法取得工地資料");
  }
}
