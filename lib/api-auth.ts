import type { NextRequest } from "next/server"
import { z } from "zod"

const roleSchema = z.enum(["radiologist", "patient"])

export function getActorFromRequest(request: NextRequest) {
  const roleRaw = request.headers.get("x-user-role") || request.nextUrl.searchParams.get("asRole") || "patient"
  const userId = request.headers.get("x-user-id") || request.nextUrl.searchParams.get("asUserId") || "user-001"

  const roleResult = roleSchema.safeParse(roleRaw)

  if (!roleResult.success) {
    return {
      ok: false as const,
      error: "Invalid role. Use radiologist or patient.",
    }
  }

  return {
    ok: true as const,
    actor: {
      role: roleResult.data,
      userId,
    },
  }
}
