import { selectUserInfo, selectUserMenus, selectUserTenant } from "@/apis/upms/login";
import { Tenant, UserInfo, UserMenus } from "@/apis/upms/login/userTypes";
import router, { resetRouter } from "@/router";
import { defineStore } from "pinia";
import { ref } from "vue";
const modules = import.meta.glob('@/views/**/*.vue')








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
    const menus = ref();

    const getUserMenus = async ()=>{
        await selectUserMenus().then(res =>{
            let userMenu = generateMenu(res.data);
            menus.value = userMenu;
            resetRouter()
        })
    }

    return {menus,getUserMenus}

},{
    persist:{
        storage:localStorage
    }
})


const generateMenu = (userMenu:UserMenus[])=>{
    let menu: { path: string; name: string; component: () => Promise<unknown>; children: any; }[] = []
    userMenu.forEach(item =>{
        if(item.parentId){
            return;
        }
        let childrens = children(userMenu,item.id)
        let routeRecord = { 
            path:`${item.menuPath}`,
            name:`${item.menuName}`,
            component: modules[`${item.menuRouter}`],
            children: childrens
        }
        menu.push(routeRecord);
    });
    return menu;
}



const children = (menus:UserMenus[],parentId:string):any =>{
    let menu: { path: string; name: string; component: () => Promise<any>; children: any; }[] = [];
    menus.forEach(item =>{
        if(item.menuName==='部门管理'){
            return
        }
        if(item.parentId !== parentId){
            return;
        }
        let routeRecord = { 
            path:`${item.menuPath}`,
            name:`${item.menuName}`,
            component:  modules[`${item.menuRouter}`],
            children:children(menus,item.id)
        }
        menu.push(routeRecord)
    })
    return menu;
}


export const switchTenant = async (index:number) =>{
    await tenantsStore().switchTenant(index)
    // menusStore()
}


export const clearStore = ()=>{
    userStore().$reset();
    tenantsStore().$reset()
    menusStore().$reset();
}