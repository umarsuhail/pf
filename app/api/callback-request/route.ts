import { NextResponse } from "next/server";
import { getDatabase } from "../../lib/mongodb";

type CallbackRequestBody = {
  name?: string;
  phone?: string;
  email?: string;
  preferredTime?: string;
  message?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CallbackRequestBody | null;

  if (!body?.name?.trim() || !body?.phone?.trim()) {
    return NextResponse.json(
      { success: false, error: "Name and phone are required." },
      { status: 400 },
    );
  }

  try {
    const db = await getDatabase();
    const collection = db.collection(
      process.env.MONGODB_CALLBACK_COLLECTION || "callback_requests",
    );

    await collection.insertOne({
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
      preferredTime: body.preferredTime?.trim() || null,
      message: body.message?.trim() || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Callback request error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to save callback request." },
      { status: 500 },
    );
  }
}
