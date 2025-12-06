<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- 顶部区域 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800 mb-4">图片标注工具</h1>
      
      <!-- 图片导入区域 -->
      <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div class="flex items-center gap-4">
          <input
            v-model="imageUrl"
            type="text"
            placeholder="输入图片URL"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="loadImage"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            加载图片
          </button>
        </div>
      </div>

      <!-- 标注任务和导出区域 -->
      <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-gray-600">标注任务：</span>
            <span class="font-medium">{{ currentTask }}</span>
          </div>
          <button
            @click="exportData"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            导出标注数据
          </button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 - 左右布局 -->
    <div class="flex gap-6 h-[600px]">
      <!-- 左侧工具栏 -->
      <div class="w-64 bg-white rounded-lg shadow-sm border p-4">
        <h3 class="text-lg font-semibold mb-4">绘图工具</h3>
        
        <div class="space-y-3">
          <button
            @click="setTool('circle')"
            :class="[
              'w-full px-4 py-3 rounded-md border transition-colors',
              currentTool === 'circle' 
                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border-2 border-current"></div>
              <span>圆形</span>
            </div>
          </button>

          <button
            @click="setTool('rect')"
            :class="[
              'w-full px-4 py-3 rounded-md border transition-colors',
              currentTool === 'rect' 
                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-current"></div>
              <span>矩形</span>
            </div>
          </button>

          <button
            @click="setTool('polygon')"
            :class="[
              'w-full px-4 py-3 rounded-md border transition-colors',
              currentTool === 'polygon' 
                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-current transform rotate-45"></div>
              <span>多边形</span>
            </div>
          </button>

          <button
            @click="clearAll"
            class="w-full px-4 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors mt-4"
          >
            清除所有标记
          </button>
        </div>

        <!-- 当前标记列表 -->
        <div class="mt-6">
          <h4 class="font-medium mb-2">当前标记</h4>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div
              v-for="(mark, index) in marks"
              :key="index"
              class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
            >
              <span>{{ mark.type }} #{{ index + 1 }}</span>
              <button
                @click="removeMark(index)"
                class="text-red-500 hover:text-red-700 text-xs"
              >
                删除
              </button>
            </div>
            <div v-if="marks.length === 0" class="text-gray-500 text-sm text-center py-2">
              暂无标记
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧画板 -->
      <div class="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
        <div ref="stageContainer" class="w-full h-full"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import Konva from 'konva';

// 响应式数据
const imageUrl = ref('')
const currentTask = ref('cars')
const currentTool = ref<'circle' | 'rect' | 'polygon'>('circle')
const image = ref<HTMLImageElement | null>(null)
const stageContainer = ref<HTMLDivElement | null>(null)

// Konva实例
let stage: any = null
let imageLayer: any = null
let drawLayer: any = null
let tempShape: any = null

// 标记数据
interface Mark {
  type: 'circle' | 'rect' | 'polygon'
  meta: any
}

const marks = ref<Mark[]>([])

// 绘图状态
const drawing = ref(false)
const startPos = ref({ x: 0, y: 0 })
const currentPos = ref({ x: 0, y: 0 })
const polygonPoints = ref<Array<{x: number, y: number}>>([])

// 设置工具
const setTool = (tool: 'circle' | 'rect' | 'polygon') => {
  currentTool.value = tool
  if (tool !== 'polygon') {
    polygonPoints.value = []
  }
}

// 初始化Konva
const initKonva = async () => {
  if (!stageContainer.value) return

  
  // 创建舞台
  stage = new Konva.Stage({
    container: stageContainer.value,
    width: stageContainer.value.clientWidth,
    height: stageContainer.value.clientHeight,
  })

  // 创建图片层
  imageLayer = new Konva.Layer()
  stage.add(imageLayer)

  // 创建绘图层
  drawLayer = new Konva.Layer()
  stage.add(drawLayer)

  // 绑定事件
  stage.on('mousedown touchstart', handleMouseDown)
  stage.on('mousemove touchmove', handleMouseMove)
  stage.on('mouseup touchend', handleMouseUp)
}

// 鼠标事件处理
const handleMouseDown = (e: any) => {
  if (!image.value) {
    alert('请先加载图片')
    return
  }

  const pos = e.target.getStage().getPointerPosition()
  startPos.value = { x: pos.x, y: pos.y }
  currentPos.value = { x: pos.x, y: pos.y }
  drawing.value = true

  if (currentTool.value === 'polygon') {
    polygonPoints.value.push({ x: pos.x, y: pos.y })
  }
}

const handleMouseMove = (e: any) => {
  if (!drawing.value || !image.value) return

  const pos = e.target.getStage().getPointerPosition()
  currentPos.value = { x: pos.x, y: pos.y }

  // 更新临时图形
  if (currentTool.value === 'circle') {
    updateTempCircle(pos)
  } else if (currentTool.value === 'rect') {
    updateTempRect(pos)
  }
}

const handleMouseUp = () => {
  if (!drawing.value || !image.value) return

  drawing.value = false

  // 添加最终标记
  if (currentTool.value === 'circle' && tempShape) {
    addCircleMark()
  } else if (currentTool.value === 'rect' && tempShape) {
    addRectMark()
  } else if (currentTool.value === 'polygon' && polygonPoints.value.length >= 3) {
    addPolygonMark()
  }

  // 清除临时图形
  if (tempShape) {
    tempShape.destroy()
    tempShape = null
    drawLayer.draw()
  }
}

// 更新临时圆形
const updateTempCircle = (pos: any) => {
  
  const radius = Math.sqrt(
    Math.pow(pos.x - startPos.value.x, 2) + 
    Math.pow(pos.y - startPos.value.y, 2)
  )

  if (tempShape) {
    tempShape.destroy()
  }

  tempShape = new Konva.Circle({
    x: startPos.value.x,
    y: startPos.value.y,
    radius: radius,
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: 'red',
    strokeWidth: 2,
  })

  drawLayer.add(tempShape)
  drawLayer.draw()
}

// 更新临时矩形
const updateTempRect = (pos: any) => {
  
  const width = pos.x - startPos.value.x
  const height = pos.y - startPos.value.y

  if (tempShape) {
    tempShape.destroy()
  }

  tempShape = new Konva.Rect({
    x: startPos.value.x,
    y: startPos.value.y,
    width: width,
    height: height,
    fill: 'rgba(0, 255, 0, 0.3)',
    stroke: 'green',
    strokeWidth: 2,
  })

  drawLayer.add(tempShape)
  drawLayer.draw()
}

// 添加圆形标记
const addCircleMark = () => {
  const radius = Math.sqrt(
    Math.pow(currentPos.value.x - startPos.value.x, 2) + 
    Math.pow(currentPos.value.y - startPos.value.y, 2)
  )

  marks.value.push({
    type: 'circle',
    meta: {
      x: startPos.value.x,
      y: startPos.value.y,
      r: radius
    }
  })

  // 绘制永久图形
  const circle = new Konva.Circle({
    x: startPos.value.x,
    y: startPos.value.y,
    radius: radius,
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: 'red',
    strokeWidth: 2,
  })
  drawLayer.add(circle)
  drawLayer.draw()
}

// 添加矩形标记
const addRectMark = () => {
  const width = currentPos.value.x - startPos.value.x
  const height = currentPos.value.y - startPos.value.y

  marks.value.push({
    type: 'rect',
    meta: {
      x: startPos.value.x,
      y: startPos.value.y,
      w: width,
      h: height
    }
  })

  // 绘制永久图形
  const rect = new Konva.Rect({
    x: startPos.value.x,
    y: startPos.value.y,
    width: width,
    height: height,
    fill: 'rgba(0, 255, 0, 0.3)',
    stroke: 'green',
    strokeWidth: 2,
  })
  drawLayer.add(rect)
  drawLayer.draw()
}

// 添加多边形标记
const addPolygonMark = () => {
  marks.value.push({
    type: 'polygon',
    meta: {
      points: [...polygonPoints.value]
    }
  })

  // 绘制永久图形
  const points = polygonPoints.value.flatMap(p => [p.x, p.y])
  const polygon = new Konva.Line({
    points: points,
    closed: true,
    fill: 'rgba(0, 0, 255, 0.3)',
    stroke: 'blue',
    strokeWidth: 2,
  })
  drawLayer.add(polygon)
  drawLayer.draw()

  polygonPoints.value = []
}

// 加载图片
const loadImage = async () => {
  if (!imageUrl.value) {
    alert('请输入图片URL')
    return
  }

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      image.value = img
      
      // 清除之前的图片
      imageLayer.destroyChildren()
      
      // 添加新图片
      const konvaImage = new Konva.Image({
        image: img,
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
      })
      imageLayer.add(konvaImage)
      imageLayer.draw()
    }
    img.onerror = () => {
      alert('图片加载失败，请检查URL是否正确')
    }
    img.src = imageUrl.value
  } catch (error) {
    alert('图片加载失败')
    console.error('图片加载错误:', error)
  }
}

// 删除标记
const removeMark = (index: number) => {
  marks.value.splice(index, 1)
  // 重新绘制所有标记
  redrawMarks()
}

// 清除所有标记
const clearAll = () => {
  marks.value = []
  polygonPoints.value = []
  // 清除绘图层
  drawLayer.destroyChildren()
  drawLayer.draw()
}

// 重新绘制所有标记
const redrawMarks = () => {
  drawLayer.destroyChildren()
  
  
  marks.value.forEach(mark => {
    if (mark.type === 'circle') {
      const circle = new Konva.Circle({
        x: mark.meta.x,
        y: mark.meta.y,
        radius: mark.meta.r,
        fill: 'rgba(255, 0, 0, 0.3)',
        stroke: 'red',
        strokeWidth: 2,
      })
      drawLayer.add(circle)
    } else if (mark.type === 'rect') {
      const rect = new Konva.Rect({
        x: mark.meta.x,
        y: mark.meta.y,
        width: mark.meta.w,
        height: mark.meta.h,
        fill: 'rgba(0, 255, 0, 0.3)',
        stroke: 'green',
        strokeWidth: 2,
      })
      drawLayer.add(rect)
    } else if (mark.type === 'polygon') {
      const points = mark.meta.points.flatMap((p: any) => [p.x, p.y])
      const polygon = new Konva.Line({
        points: points,
        closed: true,
        fill: 'rgba(0, 0, 255, 0.3)',
        stroke: 'blue',
        strokeWidth: 2,
      })
      drawLayer.add(polygon)
    }
  })
  
  drawLayer.draw()
}

// 导出数据
const exportData = () => {
  if (!imageUrl.value) {
    alert('请先加载图片')
    return
  }

  const exportData = {
    origin: imageUrl.value,
    results: {
      question: currentTask.value,
      marks: marks.value
    }
  }

  // 创建下载链接
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'annotation-data.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  alert('标注数据已导出')
}

// 初始化
onMounted(() => {
  nextTick(() => {
    initKonva()
  })
})

// 清理
onUnmounted(() => {
  if (stage) {
    stage.destroy()
  }
})
</script>

<style scoped>
/* 自定义样式 */
.konva-stage {
  width: 100%;
  height: 100%;
}
</style>
