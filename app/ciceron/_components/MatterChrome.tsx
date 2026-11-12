'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type MatterChromeValue = {
  matterTitle: string | null
  setMatterTitle: (title: string | null) => void
}

const MatterChromeContext = createContext<MatterChromeValue>({
  matterTitle: null,
  setMatterTitle: () => {},
})

export function MatterChromeProvider({ children }: { children: ReactNode }) {
  const [matterTitle, setMatterTitleState] = useState<string | null>(null)
  const setMatterTitle = useCallback((title: string | null) => {
    setMatterTitleState(title)
  }, [])
  const value = useMemo(
    () => ({ matterTitle, setMatterTitle }),
    [matterTitle, setMatterTitle]
  )
  return (
    <MatterChromeContext.Provider value={value}>{children}</MatterChromeContext.Provider>
  )
}

export function useMatterChrome() {
  return useContext(MatterChromeContext)
}

/** Sets the top-bar matter label while this tree is mounted; clears on unmount. */
export function MatterTopbarTitle({ title }: { title: string }) {
  const { setMatterTitle } = useMatterChrome()
  useEffect(() => {
    setMatterTitle(title)
    return () => setMatterTitle(null)
  }, [title, setMatterTitle])
  return null
}
