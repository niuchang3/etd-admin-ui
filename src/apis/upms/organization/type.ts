import type { Id } from '@/apis/types'

export interface Organization {
  id: Id
  parentId?: Id | null
  parentIdPath?: string
  orgCode: string
  orgName: string
  orgType?: string | null
  leaderUserId?: Id | null
  sort?: number | null
  enabled: boolean
  createTime?: string
  updateTime?: string
  children: Organization[]
}

export interface OrganizationSaveRequest {
  parentId?: Id | null
  orgCode: string
  orgName: string
  orgType?: string | null
  leaderUserId?: Id | null
  sort?: number | null
}
