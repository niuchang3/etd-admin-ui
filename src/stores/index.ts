import { createPinia } from 'pinia'
import {createPersistedState} from 'pinia-plugin-persistedstate'

const pinia = createPinia().use(createPersistedState({
    storage:sessionStorage,
    auto: true
}))

pinia.use(({store}) => {
    const initialState = JSON.parse(JSON.stringify(store.$state))
    store.$reset = () => {
        store.$state = JSON.parse(JSON.stringify(initialState))
    }
})
export default pinia 



// export default  pinia