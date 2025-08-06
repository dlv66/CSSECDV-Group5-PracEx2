import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/utils/session";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out successfully" });
    clearSessionCookie(response);
    return response;
}
