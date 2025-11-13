export const useGetCurrentTheme = () => {
    return localStorage.getItem('theme') || 'light'
}

export const useSetCurrentTheme = (theme: string) => {
    const el = document.getElementById('root')
    if (el) el.setAttribute('theme', theme)
    localStorage.setItem('theme', theme)
}