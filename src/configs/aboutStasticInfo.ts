const current_version = '0.1.0-beta'
const release_date = '2025-12-06'

export default {
    version_basic: {
        // 注意：这个前面不带v
        current_version,
        release_date,
        repo_url: 'https://github.com/star-reader/SyncSeeker_V2',
        email_url: import.meta.env.VITE_CONTACT_EMAIL || ''
    },
    road_map: [
        //有released beta planned future四个选项 
        { version: 'v0.1.0', status: 'beta', title: '基础服务', description: '连飞地图基础功能、移动端APP开发' },
        { version: 'v1.2.0', status: 'beta', title: '集成服务', description: '3D航迹、机场大屏、机场流量显示' },
        { version: 'v1.3.0', status: 'planned', title: 'NOTAM与METAR集成', description: '展示相关机场和空域的航行公告与天气信息' },
        { version: 'v1.4.0', status: 'planned', title: '天气可视化系统', description: '更详细、智能的天气可视化系统' },
        { version: 'v1.5.0', status: 'planned', title: '机组飞机图片', description: '允许机组设置航班图片' },
        { version: 'v1.6.0', status: 'planned', title: '用户登录与社群', description: '用户登录、高级用户设置、好友等' },
        { version: 'v1.7.0', status: 'planned', title: '连飞活动集成', description: '连飞活动模式与功能集成' },
        { version: 'v1.8.0', status: 'future', title: '导航数据与AMDT集成', description: '集成导航数据与机场地面AMDT系统' },
        { version: 'v1.9.0', status: 'future', title: '本地离线化记录', description: '本地飞行数据记录、更高级的飞行数据记录' },
    ],
    changelogs: [
    {
      version: current_version,
      date: release_date,
      changes: [
        '全新的 UI 设计，更现代的视觉体验',
        '基础地图与机组、管制员显示',
        '机场流量显示',
        '机场大屏功能',
        '新增气象雷达图层',
        '新增航班追踪与分享功能',
        '优化机组信息面板，新增 3D 航迹视图',
        '性能优化，更流畅的地图交互',
      ]
    }
  ],
  third_party: [
    { name: 'React', url: 'https://react.dev/', desc: 'UI 框架' },
    { name: 'Mapbox GL JS', url: 'https://www.mapbox.com/', desc: '地图渲染引擎' },
    { name: 'Vite', url: 'https://vitejs.dev/', desc: '构建工具' },
    { name: 'Zustand', url: 'https://zustand-demo.pmnd.rs/', desc: '状态管理' },
    { name: 'MUI', url: 'https://mui.com/', desc: 'UI 组件库' },
    { name: 'IconPark', url: 'https://iconpark.oceanengine.com/', desc: '图标库' },
    { name: 'PubSubJS', url: 'https://github.com/mroderick/PubSubJS', desc: '事件通信' },
    { name: 'RainViewer', url: 'https://www.rainviewer.com/', desc: '气象雷达数据' },
  ]
}