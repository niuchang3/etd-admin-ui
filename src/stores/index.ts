import { createPinia } from 'pinia'
import {createPersistedState} from 'pinia-plugin-persistedstate'

// 创建 Pinia 实例，默认将持久化数据保存到当前会话。
const pinia = createPinia().use(createPersistedState({
    storage:sessionStorage,
    auto: true
}))

export default pinia
