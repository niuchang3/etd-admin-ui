import { selectUserInfo, selectUserMenus, selectUserTenant } from "@/apis/upms/login";
import { Tenant, UserInfo, UserMenus } from "@/apis/upms/login/type";
import { defineStore } from "pinia";
import { ref } from "vue";









/** 管理当前登录用户的基本资料。 */
export const userStore = defineStore('user',()=>{

    const userInfo  = ref<UserInfo>({
        id: null,
        userName: null,
        birthday: null,
        gender: null,
        avatar: null,
        nickName: null
    })


    // 该接口依赖租户请求头，必须在租户初始化后调用。
    const getUserInfo = async ()=>{
        return await selectUserInfo().then((user) =>{
            userInfo.value = user.data
            return  userInfo.value;
        })
    }

    // 退出登录时恢复为空用户。
    const $reset = () =>{
        userInfo.value = {
            id: null,
            userName: null,
            birthday: null,
            gender: null,
            avatar: null,
            nickName: null
        }
    }

    return {userInfo,getUserInfo,$reset}
},{
    persist:{
        storage:localStorage
    }
})




/** 当前用户的租户列表和正在使用的租户。 */
interface UserTenant {
    currentTenant: Tenant | null
    tenants: Tenant[]
}

/** 管理租户列表、默认租户和租户切换。 */
export const tenantsStore = defineStore('tenantsInfo',()=>{

    const userTenant  = ref<UserTenant>({
        currentTenant: null,
        tenants: []
    });

    // 认证成功后首先获取用户可访问的租户。
    const getUserTenant = async ()=>{
        return await selectUserTenant().then((tenants)=>{
            userTenant.value.tenants = tenants.data;
            return userTenant.value.tenants;
        })
    }

    // 默认选择第一个有效租户，为后续请求建立租户上下文。
    const initializeTenant = async () => {
        const tenants = await getUserTenant()
        const tenant = tenants[0]

        if (!tenant?.id) {
            throw new Error('当前账号未分配可用租户')
        }

        userTenant.value.currentTenant = tenant
        return tenant
    }

    // 切换租户后同步刷新菜单，并可选重载当前页面。
    const switchTenant  = async (index:number, isReload = true)=>{
        if(!userTenant.value.tenants.length){
           await getUserTenant();
        }

        const tenant = userTenant.value.tenants[index]
        if (!tenant?.id) {
            throw new Error('无法切换到指定租户')
        }

        userTenant.value.currentTenant = tenant;
        await menusStore().getUserMenus();
        
        if (isReload) {
            location.reload()
        }
    }

    // 退出时清空租户列表和当前租户。
    const $reset = () =>{
        userTenant.value = {
            currentTenant: null,
            tenants: []
        }
    }

    return {userTenant,getUserTenant,initializeTenant,switchTenant,$reset}
},{
    persist:{
        storage:localStorage
    }
})





/** 保存当前租户下的树形菜单。 */
export const menusStore = defineStore('menus',()=>{
    const menus = ref<UserMenus[]>([]);
    
    // 获取扁平菜单数据并转换为树形结构。
    const getUserMenus = async ()=>{
        await selectUserMenus().then(res =>{
            menus.value =  generateMenu(res.data);
            if(!currentMenu().current){
                currentMenu().setCurrentMenu(menus.value[0].children[0].menuPath)
            }
            
        })
    }
    const $reset = () =>{
        menus.value = []
    }

    return {menus,getUserMenus,$reset}

},{
    persist:{
        storage:localStorage
    }
})


/** 记录当前选中的菜单路径。 */
export const currentMenu = defineStore('currentMenu',()=>{
    const current = ref([''])
    
    const setCurrentMenu = (path:[]) =>{
        current.value = path;
    }
    const getCurrentMenu = ():Array<string> =>{
        return current.value
    }

    const $reset = () =>{
        current.value = []
    }

    return {current,setCurrentMenu,getCurrentMenu,$reset}
},{
    persist:{
        storage:sessionStorage
    }
})


/** 向外暴露的租户切换快捷方法。 */
export const switchTenant = async (index:number, isReload = true) =>{
    await tenantsStore().switchTenant(index, isReload)
}





/** 从扁平菜单中挑选根节点，并递归填充子节点。 */
const generateMenu = (metaMenus:UserMenus[]):UserMenus[] =>{
    let menus: UserMenus[] = [];
    metaMenus.forEach((item: UserMenus) =>{
        
        if(item.parentId){
            return;
        }
        item.children = children(metaMenus,item.id)
        menus.push(item)
        
    });
    return menus;
}



/** 根据父节点 ID 递归查找下级菜单。 */
const children = (metaMenus:UserMenus[],parentId:string):UserMenus[] =>{
    let menu: UserMenus[] = [];
    
    metaMenus.forEach((item: UserMenus) =>{
        if(item.parentId !== parentId){
            return;
        }
        item.children = children(metaMenus,item.id)
        menu.push(item)
    })
    return menu;
}


/** 退出系统时统一清空所有与用户会话相关的状态。 */
export const clearStore = ()=>{
    userStore().$reset();
    tenantsStore().$reset()
    menusStore().$reset();
    currentMenu().$reset();
    return Promise.resolve(true)
}
