/**
 * think-apidoc-ui 前端配置
 * 部署时直接修改本文件即可，无需重新构建。
 */
window.apidocFeConfig = {
  // 文档标题（后端 config.title 优先生效）
  TITLE: 'Apidoc',

  // 接口请求配置
  HTTP: {
    // 后端地址列表，用于多环境切换。为空表示使用当前站点
    // 示例：[{ title: '本地', host: 'http://127.0.0.1:8000' }]
    HOSTS: [],
    // apidoc 接口前缀，需与后端 config.route_prefix 保持一致
    API_PREFIX: '/apidoc',
    // 请求超时时间（毫秒）
    TIMEOUT: 30000,
    // 跨域请求是否携带凭证（Cookie）
    WITHCREDENTIALS: false,
    // 发送请求时是否对 Header/Query 值执行 encodeURIComponent
    ENCODEURICOMPONENT: false,
  },

  // 授权访问配置
  AUTH: {
    // 未授权时 HTTP 状态码
    ERROR_STATUS: 401,
    // 未授权时响应体中的 code 字段名
    ERROR_CODE_FIELD: 'code',
  },

  // 本地缓存配置
  CACHE: {
    // 缓存键前缀，避免同域下多套文档互相覆盖
    PREFIX: 'APIDOC_',
  },

  // 菜单配置
  MENU: {
    // 是否在菜单中显示控制器名与接口 URL
    SHOWURL: false,
    // 侧栏宽度（像素）
    WIDTH: 300,
  },

  // 请求类型颜色
  METHOD_COLOR: {
    GET: '#16b777',
    POST: '#1e9fff',
    PUT: '#ffb800',
    DELETE: '#ff5722',
    PATCH: '#a233c6',
    HEAD: '#8c8c8c',
    OPTIONS: '#8c8c8c',
  },

  // 接口详情页的 Tab 顺序，可选值：table / json / ts / debug
  API_DETAIL_TABS: ['table', 'json', 'ts', 'debug'],

  // 接口详情参数表格属性
  API_TABLE_PROPS: {
    // 是否默认展开所有层级
    defaultExpandAllRows: true,
  },

  // 接口调试前/后事件。可用于对请求参数做二次处理
  DEBUG_EVENTS: {},

  // Mock 数据自定义规则，键名可在注解 @Apidoc\Param(mock="phone") 中使用
  MOCK_EXTENDS: {},

  // 自定义渲染方法
  CUSTOM_METHODS: {},

  // 需要动态加载的外部脚本，例如鉴权扩展脚本
  LOAD_SCRIPTS: [],

  // 是否显示底部 UI 版本号
  SHOW_VERSION: true,

  // 多语言配置。messages 中的键会覆盖内置词典
  LANG: [
    {
      title: '简体中文',
      lang: 'zh-cn',
      messages: {},
    },
    {
      title: 'English',
      lang: 'en',
      messages: {},
    },
  ],
}