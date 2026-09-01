
import { LoginCredentials, RefreshTokenParams, Token } from '@/apis/upms/login/type'
import { Cookies } from '@/utils/Storage'
import { loginByUserName, updateToken } from '@/apis/upms/login'
import router from '@/router/index'
import { AUTH_TOKEN_KEY } from '@/constant'

/** 执行账号密码登录，并按后端过期时间写入 Cookie。 */
export const accountLogin = async (formData: LoginCredentials) => {
  return await loginByUserName(formData).then((resData) => {
    Cookies.set<Token>(AUTH_TOKEN_KEY.ACCESS_TOKEN, resData.data.accessToken, new Date(resData.data.accessToken.expires))
    if (resData.data.refreshToken) {
      Cookies.set<Token>(AUTH_TOKEN_KEY.REFRESH_TOKEN, resData.data.refreshToken, new Date(resData.data.refreshToken.expires))
    }
    return resData
  })
}

/** 使用 Refresh Token 更新当前认证会话。 */
export const refreshToken = async () => {
  const params: RefreshTokenParams = {
    grant_type: 'refresh_token',
    refresh_token: '',
  }
  let token = getRefreshToken()
  if (!token) {
    router.push({ path: '/login' })
    return
  }
  params.refresh_token = token

  return await updateToken(params).then((resData) => {
    Cookies.set<Token>(AUTH_TOKEN_KEY.ACCESS_TOKEN, resData.data.accessToken, new Date(resData.data.accessToken.expires))
    if (resData.data.refreshToken) {
      Cookies.set<Token>(AUTH_TOKEN_KEY.REFRESH_TOKEN, resData.data.refreshToken, new Date(resData.data.refreshToken.expires))
    }
    return resData
  })
}

/** 获取当前访问令牌的原始字符串。 */
export const getAccessToken = (): string | null => {
  const token = Cookies.get<Token>(AUTH_TOKEN_KEY.ACCESS_TOKEN)
  return token ? token.value : null
}

/** 获取当前刷新令牌的原始字符串。 */
export const getRefreshToken = (): string | null => {
  const token = Cookies.get<Token>(AUTH_TOKEN_KEY.REFRESH_TOKEN)
  return token ? token.value : null
}

/** 退出登录时移除所有认证 Cookie。 */
export const clear = () => {
  Cookies.remove(AUTH_TOKEN_KEY.ACCESS_TOKEN)
  Cookies.remove(AUTH_TOKEN_KEY.REFRESH_TOKEN)
}

