"use server";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, // 💡 這是安全金鑰
  api_secret: process.env.CLOUDINARY_API_SECRET, // 💡 這是安全密鑰
});

export async function POST(request: Request) {
  try {
    const { publicId } = await request.json();

    if (!publicId)
      return NextResponse.json({ error: "缺少 Public Id" }, { status: 400 });

    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
