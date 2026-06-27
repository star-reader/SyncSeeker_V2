const current_version = '0.5.1' // 不带v
const release_date = '2026-06-27'

export default {
    version_basic: {
        // 注意：这个前面不带v
        current_version,
        release_date,
        repo_url: 'https://github.com/star-reader/SyncSeeker_V2',
        email_url: import.meta.env.VITE_CONTACT_EMAIL || ''
    }
}