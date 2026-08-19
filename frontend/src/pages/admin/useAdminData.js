import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

/*
 * One fetch, one screen.
 *
 * The console used to run a single `init()` that hit seven endpoints and
 * flipped one shared `loading` flag, so changing a filter on the content list
 * blanked the entire console while six unrelated requests it did not need
 * came back. Each screen now owns its own request and its own loading state.
 *
 * `load` has to be a stable useCallback in the caller, the same contract as
 * any other effect dependency.
 */
export function useAdminData(load, errorMessage) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            setData(await load())
        } catch {
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }, [load, errorMessage])

    useEffect(() => {
        refresh()
    }, [refresh])

    return { data, loading, refresh }
}

export default useAdminData
