/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_SERVER_PORT: number;
    readonly VITE_SERVER_BASE_API:string;
    readonly VITE_SERVER_PROXY_TARGET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}


declare module '*.vue' {
    import { DefineComponent } from 'vue'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
    const component: DefineComponent<{}, {}, any>
    export default component
}