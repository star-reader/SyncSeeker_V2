/**
 * 本地存储能力
 * @author: Jerry Jin 2025-08-13    
 * @description: 使用 IndexedDB 作为本地存储
 */

class SyncSeekerDB {
    private dbName = 'sync-seeker'
    private version = 1
    private db: IDBDatabase | null = null

    /**
     * 初始化数据库
     * 创建或连接到 sync-seeker 数据库，如果不存在则创建三个表：airlines、airports、navdata
     * @returns {Promise<void>} 无返回值，成功时 resolve，失败时 reject
     * @throws {Error} 当数据库打开失败时抛出错误
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version)

            request.onerror = () => {
                reject(new Error('Failed to open database'))
            }

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result
                resolve()
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                // 创建 airlines 表
                if (!db.objectStoreNames.contains('airlines')) {
                    const airlinesStore = db.createObjectStore('airlines', { keyPath: 'key' })
                    airlinesStore.createIndex('key', 'key', { unique: true })
                }

                // 创建 airports 表
                if (!db.objectStoreNames.contains('airports')) {
                    const airportsStore = db.createObjectStore('airports', { keyPath: 'key' })
                    airportsStore.createIndex('key', 'key', { unique: true })
                }

                // 创建 navdata 表
                if (!db.objectStoreNames.contains('navdata')) {
                    const navdataStore = db.createObjectStore('navdata', { keyPath: 'key' })
                    navdataStore.createIndex('key', 'key', { unique: true })
                }
            }
        })
    }

    /**
     * 检查数据库是否为空
     * 检查所有表（airlines、airports、navdata）是否都没有数据
     * @returns {Promise<boolean>} 如果所有表都为空返回 true，否则返回 false
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async isEmpty(): Promise<boolean> {
        if (!this.db) throw new Error('Database not initialized')

        const transaction = this.db.transaction(['airlines', 'airports', 'navdata'], 'readonly')
        const stores = ['airlines', 'airports', 'navdata']
        
        for (const storeName of stores) {
            const store = transaction.objectStore(storeName)
            const count = await this.getCount(store)
            if (count > 0) return false
        }
        
        return true
    }

    /**
     * 获取对象存储中的记录数量
     */
    private getCount(store: IDBObjectStore): Promise<number> {
        return new Promise((resolve, reject) => {
            const request = store.count()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * 通用的获取数据方法
     */
    private async getData<T>(storeName: string, key: string): Promise<T | null> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly')
            const store = transaction.objectStore(storeName)
            const request = store.get(key)

            request.onsuccess = () => {
                const result = request.result
                resolve(result ? result.value : null)
            }
            request.onerror = () => reject(request.error)
        })
    }

    /**
     * 通用的设置数据方法
     */
    private async setData(storeName: string, key: string, value: any): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite')
            const store = transaction.objectStore(storeName)
            const request = store.put({ key, value })

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    // Airlines 相关方法
    /**
     * 获取所有航空公司数据
     * @returns {Promise<IndexedDBAirlines[] | null>} 返回所有航空公司数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAllAirlines(): Promise<IndexedDBAirlines[] | null> {
        return this.getData<IndexedDBAirlines[]>('airlines', 'airlines')
    }

    /**
     * 根据 ICAO 代码获取特定航空公司
     * @param {string} icao - 航空公司的 ICAO 代码（如：'CCA'）
     * @returns {Promise<IndexedDBAirlines | null>} 返回匹配的航空公司对象，如果未找到返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAirlineByIcao(icao: string): Promise<IndexedDBAirlines | null> {
        const airlines = await this.getAllAirlines()
        if (!airlines) return null
        return airlines.find(airline => airline.icao === icao) || null
    }

    /**
     * 设置航空公司数据和版本
     * @param {IndexedDBAirlines[]} data - 航空公司数据数组
     * @param {string} version - 数据版本号（如：'1.0.0'）
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setAirlinesData(data: IndexedDBAirlines[], version: string): Promise<void> {
        await Promise.all([
            this.setData('airlines', 'airlines', data),
            this.setData('airlines', 'version', version)
        ])
    }

    // Airports 相关方法
    /**
     * 获取所有机场数据
     * @returns {Promise<IndexedDBAirports[] | null>} 返回所有机场数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAllAirports(): Promise<IndexedDBAirports[] | null> {
        return this.getData<IndexedDBAirports[]>('airports', 'airports')
    }

    /**
     * 根据 ICAO 代码获取特定机场
     * @param {string} icao - 机场的 ICAO 代码（如：'ZBAA'）
     * @returns {Promise<IndexedDBAirports | null>} 返回匹配的机场对象，如果未找到返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAirportByIcao(icao: string): Promise<IndexedDBAirports | null> {
        const airports = await this.getAllAirports()
        if (!airports) return null
        return airports.find(airport => airport.icao === icao) || null
    }

    /**
     * 设置机场数据和版本
     * @param {IndexedDBAirports[]} data - 机场数据数组
     * @param {string} version - 数据版本号（如：'1.0.0'）
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setAirportsData(data: IndexedDBAirports[], version: string): Promise<void> {
        await Promise.all([
            this.setData('airports', 'airports', data),
            this.setData('airports', 'version', version)
        ])
    }

    // FIRs 相关方法
    /**
     * 获取所有飞行情报区（FIR）数据
     * @returns {Promise<IndexedDBFIRs[] | null>} 返回所有 FIR 数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAllFirs(): Promise<IndexedDBFIRs[] | null> {
        return this.getData<IndexedDBFIRs[]>('navdata', 'firs')
    }

    /**
     * 根据 ICAO 代码获取特定飞行情报区
     * @param {string} icao - FIR 的 ICAO 代码（如：'ZBPE'）
     * @returns {Promise<IndexedDBFIRs | null>} 返回匹配的 FIR 对象，如果未找到返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getFirByIcao(icao: string): Promise<IndexedDBFIRs | null> {
        const firs = await this.getAllFirs()
        if (!firs) return null
        return firs.find(fir => fir.icao === icao) || null
    }

    /**
     * 根据类型获取飞行情报区列表
     * @param {('fir' | 'uir' | 'app')} type - FIR 类型
     * @returns {Promise<IndexedDBFIRs[]>} 返回匹配类型的 FIR 数组
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getFirsByType(type: 'fir' | 'uir' | 'app'): Promise<IndexedDBFIRs[]> {
        const firs = await this.getAllFirs()
        if (!firs) return []
        return firs.filter(fir => fir.type === type)
    }

    /**
     * 根据 ICAO 代码和类型获取特定飞行情报区
     * @param {string} icao - FIR 的 ICAO 代码（如：'ZBPE'）
     * @param {('fir' | 'uir' | 'app')} type - FIR 类型
     * @returns {Promise<IndexedDBFIRs | null>} 返回匹配的 FIR 对象，如果未找到返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getFirByIcaoAndType(icao: string, type: 'fir' | 'uir' | 'app'): Promise<IndexedDBFIRs | null> {
        const firs = await this.getAllFirs()
        if (!firs) return null
        return firs.find(fir => fir.icao === icao && fir.type === type) || null
    }

    /**
     * 设置飞行情报区数据和版本
     * @param {IndexedDBFIRs[]} data - FIR 数据数组
     * @param {string} version - 数据版本号（如：'1.0.0'）
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setFirData(data: IndexedDBFIRs[], version: string): Promise<void> {
        await Promise.all([
            this.setData('navdata', 'firs', data),
            this.setData('navdata', 'version', version)
        ])
    }

    // 版本相关方法
    /**
     * 获取指定数据表的版本号
     * @param {('airlines' | 'airports' | 'navdata')} type - 数据表类型
     * @returns {Promise<string | null>} 返回版本号字符串，如果没有版本信息返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getVersion(type: 'airlines' | 'airports' | 'navdata'): Promise<string | null> {
        return this.getData<string>(type, 'version')
    }

    /**
     * 获取全局导航数据版本信息
     * @returns {Promise<NavDataVersion | null>} 返回版本对象
     */
    async getNavDataVersion(): Promise<NavDataVersion | null> {
        return this.getData<NavDataVersion>('navdata', 'meta_version')
    }

    /**
     * 设置全局导航数据版本信息
     * @param {NavDataVersion} version - 版本对象
     */
    async setNavDataVersion(version: NavDataVersion): Promise<void> {
        await this.setData('navdata', 'meta_version', version)
    }

    // 预留的导航数据方法
    /**
     * 获取所有航路点（Waypoints）数据
     * @returns {Promise<any[] | null>} 返回航路点数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getWaypoints(): Promise<any[] | null> {
        return this.getData<any[]>('navdata', 'waypoints')
    }

    /**
     * 设置航路点数据，可选择性更新版本
     * @param {any[]} data - 航路点数据数组
     * @param {string} [version] - 可选的版本号，如果提供则同时更新 navdata 表的版本
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setWaypoints(data: any[], version?: string): Promise<void> {
        const promises = [this.setData('navdata', 'waypoints', data)]
        if (version) {
            promises.push(this.setData('navdata', 'version', version))
        }
        await Promise.all(promises)
    }

    /**
     * 获取所有航路（Airways）数据
     * @returns {Promise<any[] | null>} 返回航路数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getAirways(): Promise<any[] | null> {
        return this.getData<any[]>('navdata', 'airways')
    }

    /**
     * 设置航路数据，可选择性更新版本
     * @param {any[]} data - 航路数据数组
     * @param {string} [version] - 可选的版本号，如果提供则同时更新 navdata 表的版本
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setAirways(data: any[], version?: string): Promise<void> {
        const promises = [this.setData('navdata', 'airways', data)]
        if (version) {
            promises.push(this.setData('navdata', 'version', version))
        }
        await Promise.all(promises)
    }

    /**
     * 获取所有 VOR 导航台数据
     * @returns {Promise<any[] | null>} 返回 VOR 数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getVORs(): Promise<any[] | null> {
        return this.getData<any[]>('navdata', 'vor')
    }

    /**
     * 设置 VOR 导航台数据，可选择性更新版本
     * @param {any[]} data - VOR 数据数组
     * @param {string} [version] - 可选的版本号，如果提供则同时更新 navdata 表的版本
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setVORs(data: any[], version?: string): Promise<void> {
        const promises = [this.setData('navdata', 'vor', data)]
        if (version) {
            promises.push(this.setData('navdata', 'version', version))
        }
        await Promise.all(promises)
    }

    /**
     * 获取所有 NDB 导航台数据
     * @returns {Promise<any[] | null>} 返回 NDB 数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getNDBs(): Promise<any[] | null> {
        return this.getData<any[]>('navdata', 'ndb')
    }

    /**
     * 设置 NDB 导航台数据，可选择性更新版本
     * @param {any[]} data - NDB 数据数组
     * @param {string} [version] - 可选的版本号，如果提供则同时更新 navdata 表的版本
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setNDBs(data: any[], version?: string): Promise<void> {
        const promises = [this.setData('navdata', 'ndb', data)]
        if (version) {
            promises.push(this.setData('navdata', 'version', version))
        }
        await Promise.all(promises)
    }

    /**
     * 获取所有进近程序（Approaches）数据
     * @returns {Promise<any[] | null>} 返回进近程序数据数组，如果没有数据返回 null
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async getApproaches(): Promise<any[] | null> {
        return this.getData<any[]>('navdata', 'apps')
    }

    /**
     * 设置进近程序数据，可选择性更新版本
     * @param {any[]} data - 进近程序数据数组
     * @param {string} [version] - 可选的版本号，如果提供则同时更新 navdata 表的版本
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async setApproaches(data: any[], version?: string): Promise<void> {
        const promises = [this.setData('navdata', 'apps', data)]
        if (version) {
            promises.push(this.setData('navdata', 'version', version))
        }
        await Promise.all(promises)
    }

    /**
     * 清除所有数据
     * 删除所有表中的所有数据，包括航空公司、机场和导航数据
     * @returns {Promise<void>} 无返回值
     * @throws {Error} 当数据库未初始化时抛出错误
     */
    async clearAll(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        const transaction = this.db.transaction(['airlines', 'airports', 'navdata'], 'readwrite')
        const stores = ['airlines', 'airports', 'navdata']
        
        const promises = stores.map(storeName => {
            return new Promise<void>((resolve, reject) => {
                const store = transaction.objectStore(storeName)
                const request = store.clear()
                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })
        })

        await Promise.all(promises)
    }

    /**
     * 关闭数据库连接
     * 释放数据库资源，关闭连接
     * @returns {void} 无返回值
     */
    close(): void {
        if (this.db) {
            this.db.close()
            this.db = null
        }
    }
}

// 创建单例实例
const syncSeekerDB = new SyncSeekerDB()

export default syncSeekerDB