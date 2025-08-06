import { NextResponse } from "next/server";
import {
    clearSessionCookie,
    setGlobalLogoutTimestamp,
} from "@/lib/utils/session";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out successfully" });

    // Set global logout timestamp - this invalidates ALL sessions created before now
    setGlobalLogoutTimestamp(response);
    clearSessionCookie(response);
    return response;
}
