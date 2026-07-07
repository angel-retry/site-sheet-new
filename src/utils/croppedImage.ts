export const getCroppedImageBase64 = (
  imageUrl: string,
  crop: any,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!crop || crop.width === 0 || crop.height === 0) {
      resolve(imageUrl);
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const sX = (crop.x / 100) * img.naturalWidth;
      const sY = (crop.y / 100) * img.naturalHeight;
      const sW = (crop.w / 100) * img.naturalWidth;
      const sH = (crop.h / 100) * img.naturalHeight;

      canvas.width = sW;
      canvas.height = sH;

      ctx?.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

      const croppedBase64 = canvas.toDataURL("image/png", 0.9);
      resolve(croppedBase64);
    };

    img.onerror = (error) => {
      console.error("圖片載入失敗，無法裁切:", error);
      reject(error);
    };
  });
};
