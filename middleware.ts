import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role

    const url = req.nextUrl.pathname

    // 🔒 Protect routes by role
    if (url.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    if (url.startsWith("/teacher") && role !== "teacher") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    if (url.startsWith("/parent") && role !== "parent") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    if (url.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/parent/:path*", "/student/:path*", "/dashboard"],
}
