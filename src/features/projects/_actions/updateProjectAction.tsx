import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProjectInput } from "../_types";

export async function updatedProjectAction(
  projectId: string,
  projectData: Partial<ProjectInput>,
) {
  try {
    if (!projectId) {
      throw new Error("缺少專案 ID");
    }

    const projectRef = doc(db, "projects", projectId);

    await updateDoc(projectRef, projectData);

    return {
      success: true,
      message: "專案更新成功",
    };
  } catch (error: any) {
    console.error("Firebase 更新專案失敗:", error);
    return {
      success: false,
      message: error.message || "更新失敗，請稍後再試",
    };
  }
}
