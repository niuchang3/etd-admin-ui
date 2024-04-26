import { selectUserInfo, selectUserMenus, selectUserTenant } from "@/apis/upms/login";
import { Tenant, UserInfo, UserMenus } from "@/apis/upms/login/userTypes";
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

    return {userInfo,getUserInfo}
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
        router.push({path:'/'})
    }

    return {userTenant,getUserTenant,switchTenant}
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
            currentMenu().setCurrentMenu(menus.value[0].children[0].menuPath)
        })
    }
    return {menus,getUserMenus}

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

    return {current,setCurrentMenu,getCurrentMenu}
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
}