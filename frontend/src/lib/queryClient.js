import { QueryClient } from '@tanstack/react-query'

// Lives here rather than inline in main.jsx so AuthContext can clear the cache
// on logout without prop drilling. With a 5 minute staleTime, not clearing it
// meant one account could briefly see the previous account's feed.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
})

export default queryClient
