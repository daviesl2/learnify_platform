import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const userDB: Array<{ id: string; name: string; email: string; password: string; role: "admin" | "teacher" | "student" | "parent" }> = [
          { id: "1", name: "Test Student", email: "student@test.com", password: "123456", role: "student" },
          { id: "2", name: "Miss Smith", email: "teacher@test.com", password: "123456", role: "teacher" },
          { id: "3", name: "Mr Parent", email: "parent@test.com", password: "123456", role: "parent" },
          { id: "4", name: "Admin Man", email: "admin@test.com", password: "123456", role: "admin" },
        ]

        const user = userDB.find(
          (u) => u.email === credentials?.email && u.password === credentials?.password
        )

        if (user) return user
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "supersecretdevkey",
})

export { handler as GET, handler as POST }
