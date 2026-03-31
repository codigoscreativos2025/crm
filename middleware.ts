import { auth } from "@/auth"

export default auth(async (req) => {
    const pathname = req.nextUrl.pathname
    const user = req.auth?.user

    // If not logged in, redirect to login (except for static files and login page)
    if (!user && pathname !== "/login" && !pathname.startsWith("/api") && !pathname.includes(".")) {
        const newUrl = new URL("/login", req.nextUrl.origin)
        return Response.redirect(newUrl)
    }

    // If logged in, check plan restrictions
    if (user) {
        // @ts-ignore
        const plan = user.plan || "FREE"
        // @ts-ignore
        const role = user.role || "USER"

        // Admins have full access
        if (role === "ADMIN") {
            return
        }

        // Plan restrictions
        const freeRoutes = ["/dashboard/plan-selection", "/dashboard/plan-payment"]
        const freelanceRoutes = ["/dashboard", "/dashboard/settings", "/dashboard/api-docs"]
        
        // FREE users can only access plan selection pages
        if (plan === "FREE") {
            if (!freeRoutes.some(route => pathname.startsWith(route))) {
                // Allow access to dashboard root but will be handled by frontend
                if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
                    // Let them through, frontend will handle redirection
                    return
                }
            }
        }
        
        // FREELANCE users cannot access condominiums, contacts, funnels, etc.
        if (plan === "FREELANCE") {
            const blockedRoutes = [
                "/dashboard/condominiums",
                "/dashboard/contacts",
                "/dashboard/funnels",
                "/dashboard/chat",
                "/dashboard/metrics",
            ]
            
            if (blockedRoutes.some(route => pathname.startsWith(route))) {
                const newUrl = new URL("/dashboard", req.nextUrl.origin)
                return Response.redirect(newUrl)
            }
        }

        // PRO, EMBAJADOR have access to everything
    }
})

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/contacts",
        "/api/messages",
    ],
}