import { NextRequest, NextResponse } from "next/server";
import { getChatAuthPayload } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const payload = await getChatAuthPayload();

    if (!payload || payload.username !== "firebase") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only 'firebase' account can perform this action." },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    const messagesRef = db.collection("messages");
    
    // In Firestore Admin SDK, fetching all documents and deleting them in a batch is the standard way to clear a collection.
    // NOTE: If the collection gets massive (>500 docs), this should technically be done in multiple batches.
    // For a simple chat history, a single batch or looping delete is perfectly fine.
    const snapshot = await messagesRef.get();
    
    if (snapshot.size === 0) {
      return NextResponse.json({ success: true, message: "Chat is already empty" });
    }

    // A batch can hold up to 500 operations. If more than 500, we loop.
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      if (count === 500) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, deleted: snapshot.size });
  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear chat history" },
      { status: 500 }
    );
  }
}
