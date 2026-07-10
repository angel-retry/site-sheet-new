import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateUniqueId } from "@/utils/generateUniqueId";

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

// upload 到 cloudinary
async function uploadBlobToCloud(blobUrl: string): Promise<string> {
  try {
    const compressedBlob = await compressImage(blobUrl);

    const formData = new FormData();
    formData.append("file", compressedBlob);

    const res = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "後端上傳失敗");

    return resData.secure_url;
  } catch (error: any) {
    console.error("Cloudinary 上傳失敗:", error);
    throw new Error(
      error.message || "照片同步至 Cloudinary 失敗，請檢查網路或設定",
    );
  }
}

// 輔助函式：從 Cloudinary 安全網址中精確解析出 public_id
function getCloudinaryPublicId(url: string): string | null {
  if (!url || !url.startsWith("https://res.cloudinary.com")) return null;

  try {
    // 透過切分 /image/upload/ 之後的路徑
    const parts = url.split("/image/upload/");
    if (parts.length < 2) return null;

    // 拿後半段路徑，例如: v17182938/folder/photo_name.jpg
    const remainingPath = parts[1];

    // 移除版本號 (v開頭加上一串數字的目錄，如 v17182938/)
    const cleanPath = remainingPath.replace(/^v\d+\//, "");

    // 移除副檔名 (例如 .jpg, .png)
    const publicId = cleanPath.substring(0, cleanPath.lastIndexOf("."));

    return publicId;
  } catch (error) {
    console.error("解析 Cloudinary Public ID 失敗:", error);
    return null;
  }
}

/**
 * 💡 輔助函式：透過前端直接調用 Cloudinary API 刪除圖片
 * 注意：由於前端通常使用不帶簽名的 Upload Preset，
 * 為了安全且免簽名刪除，Cloudinary 規定必須在 Preset 啟用 "Return delete token"
 * 或是透過後端傳送 API Secret 執行。
 * * 這裡提供標準的 API 呼叫，若你的 Preset 權限不開放前端直接 destroy，
 * 它會捕捉錯誤並跳過，防止因為刪除雲端失敗而卡死你珍貴的 Firebase 資料更新！
 */
async function deleteImageFromCloudinary(publicId: string) {
  try {
    if (!publicId) return;

    await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
  } catch (err) {
    console.warn(
      "⚠️ Cloudinary 實體檔案刪除失敗（可能受限於前端免簽名權限），已忽略以確保資料庫成功同步:",
      err,
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
    console.log({ fullProjectData });

    // 深拷貝一份資料，避免非同步操作期間污染或動到前端正在編輯的 Zustand 狀態
    const rawData = JSON.parse(JSON.stringify(fullProjectData));

    // 自動相容「有包 currentProject」與「沒包 currentProject」兩種結構
    const cleanedProjectData = rawData.currentProject
      ? rawData.currentProject
      : rawData;

    // 加上嚴格防呆：如果這包資料連 projectName 或 locationZones 都沒有，代表傳錯東西了，立刻攔截！
    if (!cleanedProjectData.projectName && !cleanedProjectData.locationZones) {
      throw new Error("傳入的專案資料結構不正確，拒絕寫入資料庫以防覆蓋");
    }

    // 目前要傳入 firebase 的 locationZones，可能是空陣列或 undefined
    const currentIncomingZones = cleanedProjectData.locationZones || [];

    // 處理新加入圖片的 Cloudinary 上傳
    if (
      cleanedProjectData.locationZones &&
      Array.isArray(cleanedProjectData.locationZones)
    ) {
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

    // 使用 Firestore Batch 批次寫入子集合
    const batch = writeBatch(db);

    // 先抓取目前在firebase的資料
    const dbZonesSnapshot = await getDocs(
      collection(db, "projects", projectId, "locationZones"),
    );

    // 目前傳進來的 ID 名單
    const activeZoneIds = new Set(currentIncomingZones.map((z: any) => z.id));

    for (const zoneDoc of dbZonesSnapshot.docs) {
      const dbZoneId = zoneDoc.id;

      // 如果雲端有的位置 ID，前端這次的陣列名單裡居然不見了，代表要刪除
      if (!activeZoneIds.has(dbZoneId)) {
        // 清空此施工地點的 photos 子集合
        const photosSnapShot = await getDocs(
          collection(
            db,
            "projects",
            projectId,
            "locationZones",
            dbZoneId,
            "photos",
          ),
        );

        // 與 firebase 溝通要刪除這些資料
        for (const pDoc of photosSnapShot.docs) {
          const photoData = pDoc.data();
          if (photoData.url) {
            const publicId = getCloudinaryPublicId(photoData.url);
            if (publicId) await deleteImageFromCloudinary(publicId);
          }

          batch.delete(
            doc(
              db,
              "projects",
              projectId,
              "locationZones",
              dbZoneId,
              "photos",
              pDoc.id,
            ),
          );
        }

        // 清空此施工地點的 workItems 子集合
        const itemsSnapshot = await getDocs(
          collection(
            db,
            "projects",
            projectId,
            "locationZones",
            dbZoneId,
            "workItems",
          ),
        );

        // 與 firebase 溝通要刪除 workItems
        itemsSnapshot.forEach((iDoc) => {
          batch.delete(
            doc(
              db,
              "projects",
              projectId,
              "locationZones",
              dbZoneId,
              "workItems",
              iDoc.id,
            ),
          );
        });

        // 最後刪除這個位置本身的文件
        batch.delete(doc(db, "projects", projectId, "locationZones", dbZoneId));
      }
      // 如果區域本身沒被刪除，裡面的工項或照片也有可能被個別刪除，所以區域還在時也要做子工項比對
      else {
        const incomingZoneData = currentIncomingZones.find(
          (z: any) => z.id === dbZoneId,
        );

        if (incomingZoneData) {
          // 比對並清除被單獨移除的照片 (Photos)
          const activePhotoIds = new Set(
            (incomingZoneData.photos || []).map((p: any) => p.id),
          );

          const dbPhotosSnapshot = await getDocs(
            collection(
              db,
              "projects",
              projectId,
              "locationZones",
              dbZoneId,
              "photos",
            ),
          );

          for (const pDoc of dbPhotosSnapshot.docs) {
            if (!activePhotoIds.has(pDoc.id)) {
              const photoData = pDoc.data();

              if (photoData.url) {
                const publicId = getCloudinaryPublicId(photoData.url);
                if (publicId) await deleteImageFromCloudinary(publicId);
              }

              batch.delete(
                doc(
                  db,
                  "projects",
                  projectId,
                  "locationZones",
                  dbZoneId,
                  "photos",
                  pDoc.id,
                ),
              );
            }
          }

          // 比對並清除被單獨移除的工項 (WorkItems)
          const activeItemsIds = new Set(
            (incomingZoneData.workItems || []).map((i: any) => i.id),
          );

          const dbItemsSnapshot = await getDocs(
            collection(
              db,
              "projects",
              projectId,
              "locationZones",
              dbZoneId,
              "workItems",
            ),
          );

          dbItemsSnapshot.forEach((iDoc) => {
            if (!activeItemsIds.has(iDoc.id)) {
              batch.delete(
                doc(
                  db,
                  "projects",
                  projectId,
                  "locationZones",
                  dbZoneId,
                  "workItems",
                  iDoc.id,
                ),
              );
            }
          });
        }
      }
    }

    // 遍歷 locationZones，精準寫入各個 Subcollection
    if (
      cleanedProjectData.locationZones &&
      Array.isArray(cleanedProjectData.locationZones)
    ) {
      for (const zone of cleanedProjectData.locationZones) {
        const zoneId = zone.id || generateUniqueId();

        const zoneRef = doc(db, "projects", projectId, "locationZones", zoneId);

        // 準備寫入 zone 的基本資料（排除裡面的巢狀陣列，獨立處理）
        batch.set(
          zoneRef,
          {
            id: zoneId,
            locationName: zone.locationName || "",
            startDate: zone.startDate || "",
            endDate: zone.endDate || "",
            sortOrder: zone.sortOrder || 0,
          },
          { merge: true },
        );

        // 寫入 photos 子集合：projects/{projectId}/locationZones/{zoneId}/photos/{photoId}
        if (zone.photos && Array.isArray(zone.photos)) {
          for (const photo of zone.photos) {
            const photoId = photo.id || generateUniqueId();
            const photoRef = doc(
              db,
              "projects",
              projectId,
              "locationZones",
              zoneId,
              "photos",
              photoId,
            );
            batch.set(
              photoRef,
              {
                id: photoId,
                url: photo.url || "",
                stage: photo.stage || "before",
                timestamp: photo.timestamp || "",
                crop: photo.crop || null,
              },
              { merge: true },
            );
          }
        }

        // 寫入 workItems 子集合：projects/{projectId}/locationZones/{zoneId}/workItems/{itemId}
        if (zone.workItems && Array.isArray(zone.workItems)) {
          for (const item of zone.workItems) {
            const itemId = item.id || generateUniqueId();
            const itemRef = doc(
              db,
              "projects",
              projectId,
              "locationZones",
              zoneId,
              "workItems",
              itemId,
            );
            batch.set(
              itemRef,
              {
                id: itemId,
                itemNo: item.itemNo || "",
                itemName: item.itemName || "",
                unit: item.unit || "",
                unitPrice: Number(item.unitPrice) || 0,
                quantity: Number(item.quantity) || 0,
                note: item.note || "",
              },
              { merge: true },
            );
          }
        }
      }
    }

    // 執行 Batch 一次性寫入到 Firestore 各個不同的集合中
    await batch.commit();

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
