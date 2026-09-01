import { selectUserInfo, selectUserMenus, selectUserRole, selectUserTenant } from '@/apis/upms/login'
import type { Tenant, UserInfo, UserMenu, UserRole } from '@/apis/upms/login/type'
import { clearDynamicRoutes, syncDynamicRoutes } from '@/router'
import { canReadMenu, canWriteMenu } from '@/utils/menuPermission'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const userStore = defineStore('user', () => {
  const userInfo = ref<UserInfo>({ id: null, userName: null, birthday: null, gender: null, avatar: null, nickName: null, platformAdmin: false })
  const roles = ref<UserRole[]>([])

  const getUserInfo = async () => {
    const response = await selectUserInfo()
    userInfo.value = response.data
    return userInfo.value
  }
  const getUserRoles = async () => {
    const response = await selectUserRole()
    roles.value = response.data || []
    return roles.value
  }
  const $reset = () => {
    userInfo.value = { id: null, userName: null, birthday: null, gender: null, avatar: null, nickName: null, platformAdmin: false }
    roles.value = []
  }
  return { userInfo, roles, getUserInfo, getUserRoles, $reset }
}, { persist: { storage: localStorage } })

interface UserTenant {
  currentTenant: Tenant | null
  tenants: Tenant[]
}

export const tenantsStore = defineStore('tenantsInfo', () => {
  const userTenant = ref<UserTenant>({ currentTenant: null, tenants: [] })
  const getUserTenant = async () => {
    const response = await selectUserTenant()
    userTenant.value.tenants = response.data || []
    return userTenant.value.tenants
  }
  const initializeTenant = async () => {
    const tenants = await getUserTenant()
    const tenant = tenants[0]
    if (!tenant?.id) throw new Error('当前账号未分配可用租户')
    userTenant.value.currentTenant = tenant
    return tenant
  }
  const switchTenant = async (index: number, isReload = true) => {
    if (!userTenant.value.tenants.length) await getUserTenant()
    const tenant = userTenant.value.tenants[index]
    if (!tenant?.id) throw new Error('无法切换到指定租户')

    menusStore().$reset()
    userStore().$reset()
    userTenant.value.currentTenant = tenant
    await Promise.all([menusStore().getUserMenus(), userStore().getUserInfo(), userStore().getUserRoles()])
    if (isReload) location.reload()
  }
  const $reset = () => { userTenant.value = { currentTenant: null, tenants: [] } }
  return { userTenant, getUserTenant, initializeTenant, switchTenant, $reset }
}, { persist: { storage: localStorage } })

const compareId = (left: string, right: string) => {
  if (left.length !== right.length) return left.length - right.length
  return left.localeCompare(right)
}

export interface UserMenuNode extends UserMenu {
  children: UserMenuNode[]
}

/** 去重、标准化并构造不会因缺失父节点或环关系而崩溃的菜单树。 */
export const normalizeMenuTree = (sourceMenus: UserMenu[]): { raw: UserMenu[], tree: UserMenuNode[] } => {
  const menuMap = new Map<string, UserMenuNode>()
  ;(Array.isArray(sourceMenus) ? sourceMenus : []).forEach((source) => {
    const id = typeof source.id === 'string' ? source.id : ''
    if (!id) return
    if (menuMap.has(id)) {
      if (import.meta.env.DEV) console.warn(`[menus] 忽略重复菜单 ID: ${id}`)
      return
    }
    const accessLevel = source.accessLevel === null || source.accessLevel === 1 || source.accessLevel === 2
      ? source.accessLevel
      : 1
    if (accessLevel !== source.accessLevel && import.meta.env.DEV) {
      console.warn(`[menus] 菜单 ${id} 的 accessLevel 无效，已按只读处理`)
    }
    menuMap.set(id, {
      ...source,
      id,
      parentId: typeof source.parentId === 'string' && source.parentId ? source.parentId : null,
      accessLevel,
      children: [],
    })
  })

  const createsCycle = (item: UserMenuNode) => {
    const visited = new Set([item.id])
    let parentId = item.parentId
    while (parentId) {
      if (visited.has(parentId)) return true
      visited.add(parentId)
      parentId = menuMap.get(parentId)?.parentId || null
    }
    return false
  }

  const roots: UserMenuNode[] = []
  menuMap.forEach((item) => {
    const parent = item.parentId ? menuMap.get(item.parentId) : undefined
    const cyclic = createsCycle(item)
    if (parent && !cyclic) parent.children?.push(item)
    else {
      if ((item.parentId && !parent || cyclic) && import.meta.env.DEV) {
        console.warn(`[menus] 菜单 ${item.id} 的父子关系异常，已作为顶层菜单处理`)
      }
      roots.push(item)
    }
  })
  const sortTree = (items: UserMenuNode[]): UserMenuNode[] => items
    .sort((left, right) => (left.sort ?? 0) - (right.sort ?? 0) || compareId(left.id, right.id))
    .map((item) => ({ ...item, children: sortTree(item.children || []) }))
  const tree = sortTree(roots)
  return { raw: Array.from(menuMap.values()).map(({ children: _children, ...menu }) => menu), tree }
}

export const menusStore = defineStore('menus', () => {
  const rawMenus = ref<UserMenu[]>([])
  const menus = ref<UserMenuNode[]>([])
  const dynamicRoutesRegistered = ref(false)
  const setUserMenus = (sourceMenus: UserMenu[]) => {
    const normalized = normalizeMenuTree(sourceMenus)
    rawMenus.value = normalized.raw
    menus.value = normalized.tree
    syncDynamicRoutes(rawMenus.value.filter(canReadMenu))
    dynamicRoutesRegistered.value = true
    return menus.value
  }
  const getUserMenus = async () => {
    const response = await selectUserMenus()
    return setUserMenus(response.data || [])
  }
  const findByPath = (path: string) => rawMenus.value.find((menu) => {
    const menuPath = menu.menuPath?.trim()
    if (!menuPath) return false
    return (menuPath.startsWith('/') ? menuPath : `/${menuPath}`) === path
  })
  const canWritePath = (path: string) => {
    const menu = findByPath(path)
    return Boolean(menu && canWriteMenu(menu))
  }
  const firstReadablePath = () => rawMenus.value.find((menu) => canReadMenu(menu) && menu.menuPath)?.menuPath || null
  const $reset = () => {
    rawMenus.value = []
    menus.value = []
    dynamicRoutesRegistered.value = false
    clearDynamicRoutes()
  }
  return { rawMenus, menus, dynamicRoutesRegistered, setUserMenus, getUserMenus, findByPath, canWritePath, firstReadablePath, $reset }
}, { persist: { storage: localStorage } })

export const currentMenu = defineStore('currentMenu', () => {
  const current = ref<string[]>([])
  const setCurrentMenu = (path: string[]) => { current.value = path }
  const getCurrentMenu = () => current.value
  const $reset = () => { current.value = [] }
  return { current, setCurrentMenu, getCurrentMenu, $reset }
}, { persist: { storage: sessionStorage } })

export const switchTenant = async (index: number, isReload = true) => tenantsStore().switchTenant(index, isReload)

export const clearStore = () => {
  userStore().$reset()
  tenantsStore().$reset()
  menusStore().$reset()
  currentMenu().$reset()
  return Promise.resolve(true)
}
