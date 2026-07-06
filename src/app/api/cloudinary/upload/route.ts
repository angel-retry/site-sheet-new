"use server";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, // 💡 這是伺服器端環境變數
  api_secret: process.env.CLOUDINARY_API_SECRET, // 💡 這是伺服器端環境變數
});

export async function POST(request: Request) {
  console.log("uploading");
  try {
    // 💡 偵錯 Log 1：確認環境變數有沒有順利讀到
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error(
        "❌ 後端 API 錯誤：伺服器遺失 CLOUDINARY_API_KEY 或 SECRET 環境變數！",
      );
      return NextResponse.json(
        { error: "伺服器環境變數配置錯誤" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json(
        { error: "沒有找到上傳的檔案" },
        { status: 400 },
      );
    }

    // 將二進位 Blob 轉換為 Cloudinary 認得的 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 透過 Promise 包裝官方的 upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            // 💡 你可以直接在這裡指定後端專用的資料夾名稱
            folder: "project_photos",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(buffer);
    });

    const resData = uploadResult as any;
    // 回傳永久安全網址
    return NextResponse.json({ secure_url: resData.secure_url });
  } catch (error: any) {
    // 💡 關鍵修正：這裡的 console.error 會把「真正的 500 錯誤原因」硬生生印在你的終端機（Terminal）上！
    console.error("🔥 [Cloudinary API Route 崩潰詳細原因] :", error);
    return NextResponse.json(
      { error: error.message || "上傳失敗" },
      { status: 500 },
    );
  }
}
