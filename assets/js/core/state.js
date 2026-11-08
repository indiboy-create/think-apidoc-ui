(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})

  function getFeConfig() {
    return (window.apidocFeConfig = window.apidocFeConfig || {})
  }

  function normalizeFeConfig() {
    var cfg = getFeConfig()
    var defaults = {
      TITLE: 'Apidoc',
      HTTP: {},
      AUTH: {},
      CACHE: {},
      MENU: {},
      METHOD_COLOR: {},
      API_DETAIL_TABS: ['table', 'json', 'ts', 'debug'],
      API_TABLE_PROPS: {},
      DEBUG_EVENTS: {},
      MOCK_EXTENDS: {},
      CUSTOM_METHODS: {},
      LOAD_SCRIPTS: [],
      SHOW_VERSION: true,
      LANG: [],
    }
    Object.keys(defaults).forEach(function (key) {
      if (cfg[key] === undefined) {
        cfg[key] = defaults[key]
      }
    })
    cfg.HTTP.HOSTS = cfg.HTTP.HOSTS || []
    cfg.HTTP.TIMEOUT = cfg.HTTP.TIMEOUT || 30000
    cfg.HTTP.WITHCREDENTIALS = cfg.HTTP.WITHCREDENTIALS === true
    cfg.HTTP.ENCODEURICOMPONENT = cfg.HTTP.ENCODEURICOMPONENT === true
    cfg.AUTH.ERROR_STATUS = cfg.AUTH.ERROR_STATUS || 401
    cfg.AUTH.ERROR_CODE_FIELD = cfg.AUTH.ERROR_CODE_FIELD || 'code'
    cfg.CACHE.PREFIX = cfg.CACHE.PREFIX || 'APIDOC_'
    cfg.MENU.WIDTH = Number(cfg.MENU.WIDTH) || 300
    cfg.MENU.SHOWURL = cfg.MENU.SHOWURL === true
    if (!cfg.LANG.length) {
      cfg.LANG = [{ title: '简体中文', lang: 'zh-cn', messages: {} }]
    }
    return cfg
  }

  function Storage(prefix) {
    this.prefix = prefix
  }

  Storage.prototype.key = function (key) {
    return this.prefix + key
  }

  Storage.prototype.get = function (key, defaultValue) {
    try {
      var raw = window.localStorage.getItem(this.key(key))
      if (raw === null) return defaultValue
      return JSON.parse(raw)
    } catch (e) {
      return defaultValue
    }
  }

  Storage.prototype.set = function (key, value) {
    try {
      window.localStorage.setItem(this.key(key), JSON.stringify(value))
    } catch (e) {
      // 本地缓存不可用时静默降级
    }
  }

  Storage.prototype.remove = function (key) {
    try {
      window.localStorage.removeItem(this.key(key))
    } catch (e) {
      // ignore
    }
  }

  var feConfig = normalizeFeConfig()
  var storage = new Storage(feConfig.CACHE.PREFIX)

  var state = {
    feConfig: feConfig,
    storage: storage,
    serverConfig: { apps: [], cache: {}, params: {}, responses: {} },
    appObject: {},
    appList: [],
    appKey: '',
    lang: '',
    shareKey: '',
    apiMenus: [],
    apiMenuMeta: { app: null, groups: [], tags: [] },
    docsMenus: [],
    dashboard: {
      appCount: 0,
      apiCount: 0,
      docsCount: 0,
      apiMethodTotal: {},
      controllerGroupTotal: {},
      apiGroupTotal: {},
      apiTagTotal: {},
      apiAuthorTotal: {},
    },
    globalParams: { header: [], query: [], body: [] },
    tabs: [],
    activeTab: '',
    theme: 'light',
    device: 'desktop',
    sideWidth: feConfig.MENU.WIDTH,
    menuKeyword: '',
    menuTags: [],
    menuOpenAll: false,
    sideTab: 'api',
    globalError: null,
    loading: true,
    version: '1.0.0',
  }

  function handleApps(apps) {
    var appObject = {}
    var list = []
    var count = 0

    function walk(nodes, parentKeys, parentTitles) {
      ;(nodes || []).forEach(function (item) {
        var keys = parentKeys.concat(item.key)
        var titles = parentTitles.concat(item.title)
        var node = {
          title: item.title,
          path: item.path,
          key: item.key,
          hasPassword: item.hasPassword,
          host: item.host,
          params: item.params,
          responses: item.responses,
          groups: item.groups,
          items: item.items,
          appKey: keys.join(','),
          fullTitle: titles.join(' / '),
        }
        if (item.items && item.items.length) {
          walk(item.items, keys, titles)
        } else if (item.path !== undefined) {
          node.nodes = keys.map(function (key, index) {
            return { key: key, title: titles[index] }
          })
          appObject[node.appKey] = node
          list.push(node)
          count++
        }
      })
    }

    walk(Array.isArray(apps) ? apps : [], [], [])
    state.appObject = appObject
    state.appList = list
    state.dashboard.appCount = count
    return appObject
  }

  function parseQuery(search) {
    var result = {}
    var text = (search || '').replace(/^\?/, '')
    if (!text) return result
    text.split('&').forEach(function (pair) {
      if (!pair) return
      var parts = pair.split('=')
      var key = decodeURIComponent(parts.shift() || '')
      var value = decodeURIComponent(parts.join('=') || '')
      result[key] = value
    })
    return result
  }

  function parseHash() {
    var hash = window.location.hash || '#/home'
    var text = hash.replace(/^#/, '')
    var index = text.indexOf('?')
    var path = index > -1 ? text.slice(0, index) : text
    var query = parseQuery(index > -1 ? text.slice(index + 1) : '')
    if (!path || path === '/') path = '/home'
    return { path: path, query: query, fullPath: hash }
  }

  function buildHash(path, query) {
    var parts = []
    Object.keys(query || {}).forEach(function (key) {
      var value = query[key]
      if (value === undefined || value === null || value === '') return
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
    })
    return '#' + path + (parts.length ? '?' + parts.join('&') : '')
  }

  function initUrlState() {
    var route = parseHash()
    var cachedTheme = storage.get('APP_THEME', 'light')
    var cachedLang = storage.get('APP_LANG', '')
    var feLang = feConfig.LANG[0] ? feConfig.LANG[0].lang : 'zh-cn'
    state.theme = cachedTheme === 'dark' ? 'dark' : 'light'
    state.lang = route.query.lang || cachedLang || feLang
    state.shareKey = route.query.shareKey || ''
    state.sideWidth = Number(storage.get('SIDE_WIDTH', feConfig.MENU.WIDTH)) || feConfig.MENU.WIDTH
    state.device = window.innerWidth < 768 ? 'mobile' : 'desktop'
    var cachedHost = storage.get('HOST', '')
    state.host = cachedHost
    if (route.query.appKey) {
      state.appKey = route.query.appKey
    }
    return route
  }

  function setAppKey(appKey) {
    state.appKey = appKey
    storage.set('APP_KEY', appKey)
  }

  function setLang(lang) {
    state.lang = lang
    storage.set('APP_LANG', lang)
  }

  function setTheme(theme) {
    state.theme = theme
    storage.set('APP_THEME', theme)
  }

  function setHost(host) {
    state.host = host || ''
    if (host) storage.set('HOST', host)
    else storage.remove('HOST')
  }

  function getAuthCache() {
    return storage.get('APP_AUTH', {})
  }

  function setAuthToken(key, token) {
    var auth = getAuthCache()
    auth[key || 'global'] = token
    storage.set('APP_AUTH', auth)
  }

  function getAuthToken(appKey, shareKey) {
    var auth = getAuthCache()
    if (shareKey && auth['shareKey_' + shareKey]) return auth['shareKey_' + shareKey]
    if (appKey && auth[appKey]) return auth[appKey]
    return auth.global || ''
  }

  function initGlobalParamsCache() {
    var cached = storage.get('GLOBALPARAMS')
    if (cached && cached.header) state.globalParams = cached
  }

  function setGlobalParams(params) {
    state.globalParams = params
    storage.set('GLOBALPARAMS', params)
  }

  AD.appState = state
  AD.storage = storage
  AD.parseQuery = parseQuery
  AD.parseHash = parseHash
  AD.buildHash = buildHash
  AD.initUrlState = initUrlState
  AD.handleApps = handleApps
  AD.setAppKey = setAppKey
  AD.setLang = setLang
  AD.setTheme = setTheme
  AD.setHost = setHost
  AD.getAuthCache = getAuthCache
  AD.setAuthToken = setAuthToken
  AD.getAuthToken = getAuthToken
  AD.initGlobalParamsCache = initGlobalParamsCache
  AD.setGlobalParams = setGlobalParams
})()