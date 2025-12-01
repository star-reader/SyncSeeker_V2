
import mapboxgl from "mapbox-gl";
import * as THREE from 'three'
import generateColor from './thresholdColorGenerator'
import fix180Crossing from '../../utils/fix180Crossing'

export default (target: TargetPilotData) => {
    let scene: THREE.Scene
    let camera: THREE.Camera
    let renderer: THREE.WebGLRenderer
    let mapInstance: mapboxgl.Map | null = null

    // 生成自定义图层
    const customLayer: mapboxgl.CustomLayerInterface = {
        'id': 'detail-pilot-path-fill-3d',
        'type': 'custom',
        'renderingMode': '3d',
        'onAdd': (map, gl) => {
            mapInstance = map
            camera = new THREE.Camera()
            scene = new THREE.Scene()
            
            if (!target.tracks || target.tracks.length < 2) return

            // Pre-process tracks to handle 180 degree crossing continuously
            const tracks = fix180Crossing(target.tracks)

            // 1. 坐标转换
            const startLngLat = tracks[0]
            const centerM = mapboxgl.MercatorCoordinate.fromLngLat(
                [startLngLat[0], startLngLat[1]], 
                0
            )
            const metersPerUnit = centerM.meterInMercatorCoordinateUnits()
            
            // 构建点集
            const points: THREE.Vector3[] = []
            const altitudes: number[] = []
            const lastPos = new THREE.Vector3()
            let previousRawX = 0
            let cumulativeWrapX = 0
            
            for (let i = 0; i < tracks.length; i++) {
                const lng = tracks[i][0]
                const lat = tracks[i][1]
                let alt = target.altitudeArray ? (target.altitudeArray[i] || 0) : 0

                // Sanity check for altitude: Clamp to 0-100,000 feet (approx 30km)
                // This prevents outliers from shooting into space
                alt = Math.max(0, Math.min(alt, 100000))

                // Skip invalid coordinates (0,0 is likely invalid for flight data unless it's a drone at null island)
                if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) continue

                const mc = mapboxgl.MercatorCoordinate.fromLngLat(
                    [lng, lat], 
                    alt * 0.3048 // 英尺转米
                )
                
                // Handle Antimeridian crossing (Longitude unwrapping)
                if (i > 0) {
                    const diffX = mc.x - previousRawX
                    if (diffX < -0.5) {
                        cumulativeWrapX += 1
                    } else if (diffX > 0.5) {
                        cumulativeWrapX -= 1
                    }
                }
                previousRawX = mc.x

                const p = new THREE.Vector3(
                    (mc.x + cumulativeWrapX) - centerM.x,
                    mc.y - centerM.y,
                    mc.z - centerM.z
                )
                
                if (i === 0 || p.distanceTo(lastPos) > 1e-8) {
                    points.push(p)
                    altitudes.push(alt)
                    lastPos.copy(p)
                }
            }
            
            if (points.length < 2) return

            // 2. 创建平滑曲线
            const curve = new THREE.CatmullRomCurve3(points)
            curve.curveType = 'centripetal' 
            curve.tension = 0.5

            const segments = (points.length - 1) * 10
            const curvePoints = curve.getSpacedPoints(segments)
            
            // 辅助：计算高度
            const pointLengths: number[] = [0]
            let totalLen = 0
            for(let i=1; i<points.length; i++) {
                totalLen += points[i].distanceTo(points[i-1])
                pointLengths.push(totalLen)
            }
            
            const getAltAtLen = (len: number) => {
                for(let i=0; i<pointLengths.length-1; i++) {
                    if (len >= pointLengths[i] && len <= pointLengths[i+1]) {
                        const t = (len - pointLengths[i]) / (pointLengths[i+1] - pointLengths[i])
                        return altitudes[i] + (altitudes[i+1] - altitudes[i]) * t
                    }
                }
                return altitudes[altitudes.length-1]
            }

            // ==========================================
            // Part A: 垂直幕墙 (Curtain / Wall)
            // 连接飞行轨迹和地面投影
            // ==========================================
            
            const wallVertices: number[] = []
            const wallColors: number[] = []
            const wallIndices: number[] = []
            
            let currentLen = 0
            
            for (let i = 0; i < curvePoints.length; i++) {
                const p = curvePoints[i]
                if (i > 0) currentLen += p.distanceTo(curvePoints[i-1])
                
                const alt = getAltAtLen(currentLen)
                const colorHex = generateColor(alt)
                const color = new THREE.Color(colorHex)
                
                // Top Vertex (Flight Path)
                wallVertices.push(p.x, p.y, p.z)
                wallColors.push(color.r, color.g, color.b) // Full color
                
                // Bottom Vertex (Ground Projection)
                // Local Z=0 corresponds to CenterM's altitude (which is 0)
                // But we need to be careful: Mercator projection distorts scale.
                // However, for visual purposes, (x, y, 0) is the ground projection of (x, y, z).
                wallVertices.push(p.x, p.y, 0)
                
                // Bottom color: slightly darker or same?
                // Let's make it same color, opacity will handle the fade feel
                wallColors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8) 

                // Indices
                if (i > 0) {
                    const currTop = i * 2
                    const currBot = i * 2 + 1
                    const prevTop = (i - 1) * 2
                    const prevBot = (i - 1) * 2 + 1
                    
                    // Two triangles to form a quad
                    // 1. PrevTop -> PrevBot -> CurrBot
                    wallIndices.push(prevTop, prevBot, currBot)
                    // 2. PrevTop -> CurrBot -> CurrTop
                    wallIndices.push(prevTop, currBot, currTop)
                }
            }
            
            const wallGeometry = new THREE.BufferGeometry()
            wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallVertices, 3))
            wallGeometry.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3))
            wallGeometry.setIndex(wallIndices)
            wallGeometry.computeVertexNormals()

            const wallMaterial = new THREE.MeshBasicMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4, // 半透明
                depthWrite: false // 防止遮挡内部
            })
            
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
            wallMesh.position.set(centerM.x, centerM.y, centerM.z)
            scene.add(wallMesh)


            // ==========================================
            // Part B: 顶部轨迹线 (Top Tube)
            // 实体管道，显示实际飞行路径
            // ==========================================
            
            const tubeRadius = 10 * metersPerUnit // 半径10米
            const tubeGeometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false)
            
            // Apply colors to tube
            const tubeCount = tubeGeometry.attributes.position.count
            const tubeColors = new Float32Array(tubeCount * 3)
            const radialSegments = 8
            const ringSize = radialSegments + 1
            const ringCount = segments + 1
            
            for (let i = 0; i < ringCount; i++) {
                const t = i / segments
                // Need to map t back to length to get accurate altitude? 
                // TubeGeometry parameterizes by arc length roughly if curve is good.
                // We can approximate using the same point-based logic or just simple interpolation
                // Since we used getSpacedPoints for the wall, the 'segments' align roughly with distance.
                // Let's re-use the altitude array mapping logic but mapped to t [0,1]
                
                // Map t (0->1) to totalLen
                const targetL = t * totalLen
                const alt = getAltAtLen(targetL)
                
                const c = new THREE.Color(generateColor(alt))
                
                for (let j = 0; j < ringSize; j++) {
                    const idx = (i * ringSize + j) * 3
                    tubeColors[idx] = c.r
                    tubeColors[idx+1] = c.g
                    tubeColors[idx+2] = c.b
                }
            }
            tubeGeometry.setAttribute('color', new THREE.BufferAttribute(tubeColors, 3))

            const tubeMaterial = new THREE.MeshBasicMaterial({
                vertexColors: true,
                opacity: 1.0,
                transparent: false,
                side: THREE.DoubleSide
            })
            
            const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial)
            tubeMesh.position.set(centerM.x, centerM.y, centerM.z)
            scene.add(tubeMesh)

            // Renderer Setup
            renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true
            });
            renderer.autoClear = false
        },
        'render': (gl, matrix) => {
            const m = new THREE.Matrix4().fromArray(matrix);
            camera.projectionMatrix = m;

            renderer.resetState();
            renderer.render(scene, camera);
            mapInstance?.triggerRepaint();
        }
    }
    return customLayer
}
