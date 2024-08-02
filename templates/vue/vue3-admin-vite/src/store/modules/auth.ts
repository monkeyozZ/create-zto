/*
 * @Author: houbaoguo
 * @Date: 2024-07-30 17:45:17
 * @Description:
 * @LastEditTime: 2024-07-30 17:54:58
 * @LastEditors: houbaoguo
 */
import { defineStore } from "pinia"
import { useUserStore } from "./user"
import { LoginService } from "@/api/login"
import { ILoginService, type LoginRequestData } from "@/api/login/types/login"
import { setToken } from "@/utils/cache/cookies"

const loginService: ILoginService = new LoginService()
/**
 * 用户认证状态管理
 */
export const useAuthStore = defineStore("auth", () => {
  const userStore = useUserStore()

  /**
   * 用户登录
   * @param {LoginRequestData} loginData - 登录请求数据
   */
  const login = async (loginData: LoginRequestData) => {
    const { data } = await loginService.loginApi(loginData)
    userStore.token = data.token
    setToken(data.token)
    await getInfo()
  }

  /**
   * 获取用户信息
   */
  const getInfo = async () => {
    const { data } = await loginService.getUserInfoApi()
    userStore.username = data.username
    userStore.roles = data.roles
  }

  return { login, getInfo }
})

export function useAuthStoreHook() {
  return useAuthStore()
}
