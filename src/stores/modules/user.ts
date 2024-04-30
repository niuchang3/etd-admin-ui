import { selectUserInfo, selectUserMenus, selectUserTenant } from "@/apis/upms/login";
import { Tenant, UserInfo, UserMenus } from "@/apis/upms/login/type";
import router, { resetRouter } from "@/router";
import { defineStore } from "pinia";
import { ref } from "vue";









export const userStore = defineStore('user',()=>{

    const userInfo  = ref<UserInfo>({
        id: null,
        userName: null,
        birthday: null,
        gender: null,
        avatar: null,
        nickName: null
    })


    const getUserInfo = async ()=>{
        return await selectUserInfo().then((user) =>{
            userInfo.value = user.data
            return  userInfo.value;
        })
    }

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




interface UserTenant{
    currentTenant:Tenant | any
    tenants:Tenant[] | any,
    
}

export const tenantsStore = defineStore('tenantsInfo',()=>{

    const userTenant  = ref<UserTenant>({
        currentTenant: {},
        tenants: []
    });

    const getUserTenant = async ()=>{
        return await selectUserTenant().then((tenants)=>{
            userTenant.value.tenants = tenants.data;
            return userTenant.value.tenants;
        })
    }

    const switchTenant  = async (index:number)=>{
        if(!userTenant.value.tenants){
           await getUserTenant();
        }

        userTenant.value.currentTenant = userTenant.value.tenants[index];
        await menusStore().getUserMenus();
        
        location.reload()
    }

    const $reset = () =>{
        userTenant.value = {
            currentTenant: {},
            tenants: []
        }
    }

    return {userTenant,getUserTenant,switchTenant,$reset}
},{
    persist:{
        storage:localStorage
    }
})





export const menusStore = defineStore('menus',()=>{
    const menus = ref<UserMenus[]>([]);
    
    const getUserMenus = async ()=>{
        await selectUserMenus().then(res =>{
            menus.value =  generateMenu(res.data);
            resetRouter()
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


export const currentMenu = defineStore('currentMenu',()=>{
    const current = ref('')
    
    const setCurrentMenu = (path:string) =>{
        current.value = path;
    }
    const getCurrentMenu = () =>{
        return current.value
    }

    const $reset = () =>{
        current.value = ''
    }

    return {current,setCurrentMenu,getCurrentMenu,$reset}
},{
    persist:{
        storage:sessionStorage
    }
})


export const switchTenant = async (index:number) =>{
    await tenantsStore().switchTenant(index)
}





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


export const clearStore = ()=>{
    userStore().$reset();
    tenantsStore().$reset()
    menusStore().$reset();
    currentMenu().$reset();
    return Promise.resolve(true)
}