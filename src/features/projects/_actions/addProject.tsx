import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProjectInput } from "../_types";

export async function addProjectAction(projectData: ProjectInput) {
  try {
    const projectsCol = collection(db, "projects");

    const docRef = await addDoc(projectsCol, {
      ...projectData,
      createdAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Firebase Add Error:", error);
    return { success: false, error: "新增專案失敗" };
  }
}
