/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_BASIC_URL: string;
    readonly VITE_HOST: string;
    readonly VITE_PORT: number;

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