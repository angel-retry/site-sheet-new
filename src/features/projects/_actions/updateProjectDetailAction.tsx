import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 輔助函式：前端純 JavaScript 圖片壓縮
 * 限制最大寬度 1200px 且壓縮品質為 0.75，大幅節省 Cloudinary 的免費額度
 */
function compressImage(blobUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = blobUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // 限制最大寬度為 1200 像素，等比例縮小
      const MAX_WIDTH = 1200;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      // 轉成 jpeg，品質給 0.75（約可將 5MB 照片降至 150KB 左右）
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("圖片壓縮失敗"));
        },
        "image/jpeg",
        0.75,
      );
    };
    img.onerror = (err) => reject(err);
  });
}

/**
 * 將臨時 blob 網址壓縮後，上傳到 Cloudinary 免費空間
 * @param blobUrl 前端傳過來的 "blob:http://localhost:3000/..."
 * @returns 真正的 Cloudinary 永久網址 "https://res.cloudinary.com/..."
 */
async function uploadBlobToCloud(blobUrl: string): Promise<string> {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "環境變數缺少 Cloudinary 配置 (Cloud Name 或 Upload Preset)",
      );
    }

    // 🚀 1. 上傳前呼叫壓縮函式，取得壓縮後的 Blob 資料
    const compressedBlob = await compressImage(blobUrl);

    // 2. 打包成 Cloudinary 要求的 FormData 格式
    const formData = new FormData();
    formData.append("file", compressedBlob); // 傳入壓縮後的檔案
    formData.append("upload_preset", uploadPreset);

    // 3. 直接發送請求給 Cloudinary API
    const cloudinaryRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const resData = await cloudinaryRes.json();

    if (!cloudinaryRes.ok) {
      throw new Error(resData.error?.message || "Cloudinary 拒絕上傳");
    }

    // 4. 上傳成功，回傳永久圖片網址
    return resData.secure_url;
  } catch (error: any) {
    console.error("Cloudinary 上傳失敗:", error);
    throw new Error(
      error.message || "照片同步至 Cloudinary 失敗，請檢查網路或設定",
    );
  }
}

/**
 * 將整包專案（包含巢狀的區域、工項與照片）一次性存入 Firebase Firestore
 * @param projectId 專案的 Document ID
 * @param fullProjectData 從 Zustand 丟過來的最新全域狀態
 */
export async function updateProjectDetailAction(
  projectId: string,
  fullProjectData: any,
) {
  try {
    if (!projectId) throw new Error("缺少專案 ID");

    // 1. 深拷貝一份資料，避免非同步操作期間污染或動到前端正在編輯的 Zustand 狀態
    const cleanedProjectData = JSON.parse(JSON.stringify(fullProjectData));

    // 2. 🚀 遍歷所有區域，自動抓出新加入的 blob 圖片進行上傳與網址替換
    if (cleanedProjectData.locationZones) {
      for (const zone of cleanedProjectData.locationZones) {
        // 加上防呆確保 photos 陣列存在
        if (zone.photos && Array.isArray(zone.photos)) {
          for (const photo of zone.photos) {
            // 如果網址是本地臨時網址，代表是新照片，執行壓縮上傳並覆蓋成雲端網址
            if (photo.url && photo.url.startsWith("blob:")) {
              const cloudUrl = await uploadBlobToCloud(photo.url);
              photo.url = cloudUrl;
            }
          }
        }
      }
    }

    // 3. 指定到當前 Firestore 內的特定專案 Document
    const projectRef = doc(db, "projects", projectId);

    // 4. 執行一次性更新寫入
    await updateDoc(projectRef, {
      projectName: cleanedProjectData.projectName || "",
      unit: cleanedProjectData.unit || "",
      startDate: cleanedProjectData.startDate || "",
      endDate: cleanedProjectData.endDate || "",
      contractAmount: Number(cleanedProjectData.contractAmount) || 0, // 確保強制轉成數字型態
      locationZones: cleanedProjectData.locationZones || [], // 巢狀陣列一次同步
      updatedAt: new Date().toISOString(), // 紀錄最後同步時間
    });

    return {
      success: true,
      message: "工單整包資料同步成功",
    };
  } catch (error: any) {
    console.error("Firebase 完整更新失敗:", error);
    return {
      success: false,
      message: error.message || "同步失敗，請稍後再試",
    };
  }
}
