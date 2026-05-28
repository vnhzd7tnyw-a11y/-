# 赛题档案馆

这是一个面向设计专业大学生的非商业设计竞赛资料网站。

## 打开方式

推荐方式：

1. 打开项目文件夹 `design-brief-archive`
2. 用本地服务器预览，或部署到 GitHub Pages、Netlify、Vercel
3. 访问 `index.html`

也可以直接双击 `index.html`。如果浏览器限制读取本地 JSON，页面会自动使用 `data/archive-data.js` 里的只读兜底数据。

## 主要页面

- `index.html`：首页、资料库状态、比赛入口
- `search.html`：全站搜索，统一检索比赛、主题、作品、案例和文章
- `competitions.html`：比赛库、搜索、地区/范围/来源筛选
- `similar.html`：相似赛题分组，帮助判断同一作品方向可投哪些比赛
- `cases.html`：往年优秀案例索引
- `planner.html`：参赛路径规划
- `dashboard.html`：我的参赛看板，仅保存在当前浏览器本地
- `submit-helper.html`：参赛材料整理和官网提交前检查
- `maintenance.html`：资料库维护中心，查看待核验条目、区域覆盖和维护建议
- `guide.html`：学生使用指南
- `privacy.html`：隐私、版权和报名边界说明

## 后期维护

- 比赛信息：编辑 `data/competitions.json`
- 历年主题：编辑 `data/themes.json`
- 优秀作品索引：编辑 `data/works.json`
- 往年优秀案例：编辑 `data/cases.json`
- 赛题解析文章：编辑 `data/articles.json`
- 我的参赛看板：只保存在学生当前浏览器的本地存储中，不写入服务器文件

更新 JSON 后，建议同步更新 `data/archive-data.js` 中的兜底数据，确保直接本地打开也稳定。

可用维护脚本：

- `scripts/sync-archive-data.js`：把 JSON 数据同步到 `data/archive-data.js`
- `scripts/validate-data.js`：检查比赛数量、公开来源、待核验条目、重复 ID 和地区覆盖
- `scripts/check-site.js`：临时启动本地服务并检查关键页面是否可访问

## 合规原则

本站只做学习研究、信息索引与原创分析。

- 不提供他人作品高清下载
- 不二次分发他人作品
- 不冒充比赛官方平台
- 不售卖比赛资料
- 所有比赛、主题、作品、案例都应保留来源字段和版权说明
- 报名和作品提交必须以比赛官网或主办方官方发布信息为准
