import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/utils/jwt";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out" });
    clearAuthCookie(response);
    return response;
}
