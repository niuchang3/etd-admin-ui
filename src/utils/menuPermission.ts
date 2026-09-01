import type { UserMenu } from '@/apis/upms/login/type'
import { MENU_ACCESS_LEVEL } from '@/constant'

/** null 表示管理员不受角色访问级别限制。 */
export const canReadMenu = (menu: UserMenu): boolean =>
  menu.accessLevel === null || menu.accessLevel === MENU_ACCESS_LEVEL.READ_ONLY || menu.accessLevel === MENU_ACCESS_LEVEL.READ_WRITE

/** 未知访问级别不会通过该判断，因此默认没有写权限。 */
export const canWriteMenu = (menu: UserMenu): boolean =>
  menu.accessLevel === null || menu.accessLevel === MENU_ACCESS_LEVEL.READ_WRITE

