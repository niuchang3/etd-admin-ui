import { createPinia } from 'pinia'
import {createPersistedState} from 'pinia-plugin-persistedstate'

const pinia = createPinia().use(createPersistedState({
    storage:sessionStorage,
    auto: true
}))

export default pinia 



// export default  pinia