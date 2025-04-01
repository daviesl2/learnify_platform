import NextAuth from "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      role?: "admin" | "teacher" | "student" | "parent"
    }
  }

  interface User {
    role?: "admin" | "teacher" | "student" | "parent"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "teacher" | "student" | "parent"
  }
}
