export default (logon: string) => {
    const t = new Date(logon).getTime()
    const diff = Math.max(0, Date.now() - t)
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h ? `${h}h ${m}m` : `${m}m`
}