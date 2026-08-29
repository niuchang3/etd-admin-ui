import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 全局页面加载进度条配置。
export default NProgress.configure({
    easing: 'ease', // 进度动画的缓动方式。
    speed: 1000, // 每次进度动画的持续时间。
    showSpinner: false, // 关闭右上角加载图标。
    trickleSpeed: 200, // 自动递增进度的间隔。
    minimum: 0.3, // 进度条启动时的最小进度。
    parent: 'body', // 将进度条挂载在 body 下。
})
