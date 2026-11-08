# think-apidoc-ui（layui 版）

基于 [layui](https://layui.dev/) 重写的 ThinkPHP ApiDoc 前端文档界面，对接 [apidoc-php](https://github.com/HGthecode/apidoc-php) 的 JSON 接口。

纯静态资源，无需 Node、Vue、Vite 或任何构建步骤，修改 `config.js` 即可部署。

## 功能

- 多应用 / 多版本切换，支持应用密码授权
- 接口树、控制器分组、标签筛选、关键字搜索、全部展开/收起
- 多页签浏览、右键关闭当前/左侧/右侧/全部
- 接口详情：文档表格、JSON、TypeScript、在线调试
- 在线调试：Header / Query / Route / Body 参数编辑、Mock 数据、全局参数、请求前/后事件、响应头与耗时
- Markdown 文档：目录锚点、代码高亮、字段说明弹窗
- 全局参数：按应用配置 Header / Query / Body，并持久化到本地
- 工具：接口生成器、代码模板、接口分享、Swagger 导出、缓存管理
- 亮色 / 暗色主题、多语言、后端 Host 切换
- 接口分享链接（`shareKey`）只读访问

## 快速开始

1. 将本项目所有文件放入 ThinkPHP 项目的 `public/apidoc` 目录。
2. 确认 `config.js` 中 `HTTP.API_PREFIX` 与后端 `config/apidoc.php` 的 `route_prefix` 一致（默认 `/apidoc`）。
3. 浏览器访问 `http://你的域名/apidoc/index.html`。

如果前端与后端不同域，在 `config.js` 中配置：

```js
HTTP: {
  HOSTS: [{ title: '后端', host: 'https://api.example.com' }],
  WITHCREDENTIALS: true,
  API_PREFIX: '/apidoc',
}
```

## 目录结构

```
think-apidoc-ui/
├── index.html                 页面入口
├── config.js                  前端配置（部署时修改）
├── favicon.ico
├── assets/
│   ├── css/
│   │   ├── apidoc.css         布局、主题与组件样式
│   │   └── custom.css         项目自定义样式
│   ├── js/
│   │   ├── app.js             启动、路由、顶栏与初始化
│   │   ├── core/
│   │   │   ├── state.js       全局状态与本地缓存
│   │   │   ├── http.js        请求封装（Host、Token、分享、超时）
│   │   │   ├── api.js         后端接口
│   │   │   ├── debug.js       在线调试与事件执行
│   │   │   ├── code.js        JSON / TypeScript 生成
│   │   │   ├── markdown.js    Markdown 渲染与高亮
│   │   │   ├── mock.js        Mock 数据
│   │   │   ├── i18n.js        多语言
│   │   │   └── utils.js       工具函数
│   │   ├── components/
│   │   │   ├── sidebar.js     应用选择、接口树、搜索与标签
│   │   │   ├── tabs.js        多页签
│   │   │   ├── api-table.js   参数/响应表格（layui treeTable）
│   │   │   ├── auth.js        授权弹窗
│   │   │   └── global-params.js 全局参数
│   │   └── pages/
│   │       ├── home.js        首页
│   │       ├── api-detail.js  接口详情与调试
│   │       ├── md-detail.js   Markdown 文档
│   │       ├── generator.js   接口生成器
│   │       ├── code-template.js 代码模板
│   │       └── api-share.js   接口分享
│   ├── utils/md5.js           密码加密
│   └── vendor/                本地依赖（layui、marked、highlight.js、mockjs）
└── README.md
```

## 配置

完整配置及中文说明见 `config.js`。常用项：

| 配置 | 说明 |
| --- | --- |
| `HTTP.API_PREFIX` | apidoc 接口前缀，必须与后端 `route_prefix` 一致 |
| `HTTP.HOSTS` | 后端地址列表，为空时使用当前站点 |
| `HTTP.WITHCREDENTIALS` | 跨域时是否携带 Cookie |
| `HTTP.ENCODEURICOMPONENT` | 调试请求的 Header/Query 值是否转义 |
| `AUTH.ERROR_STATUS` | 未授权状态码，默认 `401` |
| `CACHE.PREFIX` | 本地缓存前缀，多套文档部署在同域时需区分 |
| `MENU.SHOWURL` | 菜单中是否显示控制器与接口 URL |
| `API_DETAIL_TABS` | 详情页 Tab 顺序：`table` / `json` / `ts` / `debug` |
| `SHOW_VERSION` | 是否显示页面底部版本号 |
| `LANG` | 语言列表与词条覆盖 |
| `DEBUG_EVENTS` | 自定义调试事件 |
| `MOCK_EXTENDS` | 自定义 Mock 规则 |
| `CUSTOM_METHODS` | 自定义渲染方法 |

后端配置（`config/apidoc.php`）中的标题、描述、应用、全局参数、响应体、代码生成器、代码模板、分享与导出配置会自动读取，无需在前端重复维护。

## 后端接口协议

前端与 apidoc-php 3.x 的接口保持一致，所有响应格式为：

```json
{ "code": 0, "message": "", "data": {} }
```

使用到的接口：

`/config`、`/apiMenus`、`/apiDetail`、`/docMenus`、`/docDetail`、`/verifyAuth`、`/generator`、`/renderCodeTemplate`、`/allApiMenus`、`/addApiShare`、`/getApiShareList`、`/getApiShareDetail`、`/deleteApiShare`、`/handleApiShareAction`、`/exportSwagger`、`/cancelAllCache`、`/createAllCache`。

未授权时后端返回 HTTP `401` 或业务码 `4001`，前端会弹出密码框并在验证成功后自动重试。

## 接口分享

分享链接格式：

```
https://your-domain/apidoc/index.html#/home?shareKey=分享key
```

分享模式会隐藏工具菜单，只展示被授权的应用或接口。

## 浏览器兼容

推荐 Chrome / Edge / Firefox / Safari 最新版。依赖浏览器原生 `fetch`、`Promise`、`URL` 与 `localStorage`。

## 开发说明

项目没有构建链，所有源码即发布产物。开发时任意静态服务器即可预览（需后端接口同源或配置 `HOSTS`）。新增页面模块后，在 `index.html` 中按依赖顺序引入脚本，并在 `app.js` 的 `renderPage` 中注册路由。

## License

MIT