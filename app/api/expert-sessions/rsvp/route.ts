// app/api/expert-sessions/rsvp/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const formData = await request.formData()
  const expertSessionId = String(formData.get("expertSessionId"))
  const rsvp = String(formData.get("rsvp"))

  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=Could not authenticate`, {
      status: 301,
    })
  }

  if (!expertSessionId) {
    return NextResponse.redirect(`${requestUrl.origin}/?error=Missing expertSessionId`, {
      status: 301,
    })
  }

  try {
    if (rsvp === "true") {
      const { error } = await supabase
        .from("expert_session_attendees")
        .upsert({ expert_session_id: expertSessionId, attendee_id: user.id, attending: true })
        .select()

      if (error) {
        console.error("Error during rsvp upsert:", error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=RSVP failed`, {
          status: 301,
        })
      }
    } else {
      const { error } = await supabase
        .from("expert_session_attendees")
        .upsert({ expert_session_id: expertSessionId, attendee_id: user.id, attending: false })
        .select()

      if (error) {
        console.error("Error during rsvp upsert:", error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=RSVP failed`, {
          status: 301,
        })
      }
    }
  } catch (e) {
    console.error("Unexpected error during RSVP:", e)
    return NextResponse.redirect(`${requestUrl.origin}/?error=Unexpected error during RSVP`, {
      status: 301,
    })
  }

  return NextResponse.redirect(requestUrl.origin, { status: 301 })
}

