export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * 教師登入頁路徑（取代 Manus OAuth）
 * 部署時改用 TEACHER_PASSWORD 環境變數保護
 */
export const getLoginUrl = (): string => "/login";