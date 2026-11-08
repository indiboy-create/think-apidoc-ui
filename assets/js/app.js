(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils
  var state = AD.appState

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function contentEl() {
    return document.getElementById('ad-content')
  }

  function hideLoading() {
    var loading = document.getElementById('ad-loading')
    if (loading) loading.parentNode.removeChild(loading)
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme)
    var lightCss = document.getElementById('ad-hljs-light')
    var darkCss = document.getElementById('ad-hljs-dark')
    if (lightCss) lightCss.disabled = state.theme === 'dark'
    if (darkCss) darkCss.disabled = state.theme !== 'dark'
    var btn = document.getElementById('ad-theme-btn')
    if (btn) {
      var icon = btn.querySelector('i')
      if (icon) {
        icon.className =
          'layui-icon ' + (state.theme === 'dark' ? 'layui-icon-light' : 'layui-icon-circle-dot')
      }
      btn.setAttribute('title', state.theme === 'dark' ? '切换亮色主题' : '切换暗色主题')
    }
  }

  function applyDevice() {
    state.device = window.innerWidth < 768 ? 'mobile' : 'desktop'
    document.body.classList.toggle('ad-mobile', state.device === 'mobile')
    if (state.device === 'desktop') closeSide()
  }

  function applySideWidth() {
    document.documentElement.style.setProperty('--ad-side-width', state.sideWidth + 'px')
  }

  function openSide() {
    document.body.classList.add('ad-side-open')
    document.getElementById('ad-side').classList.add('open')
    var mask = document.getElementById('ad-side-mask')
    if (mask) mask.classList.add('show')
  }

  function closeSide() {
    document.body.classList.remove('ad-side-open')
    var side = document.getElementById('ad-side')
    if (side) side.classList.remove('open')
    var mask = document.getElementById('ad-side-mask')
    if (mask) mask.classList.remove('show')
  }

  function showGlobalError(error) {
    hideLoading()
    var content = contentEl()
    var message = (error && error.data && error.data.message) || (error && error.message) || ''
    content.innerHTML =
      '<div class="ad-error-card">' +
      '<h3>' + escape(AD.t('common.error')) + '</h3>' +
      '<p>' + escape(message) + '</p>' +
      '<button type="button" class="layui-btn layui-btn-sm" onclick="location.reload()">' +
      escape(AD.t('common.reload')) + '</button></div>'
  }

  function computeDashboard() {
    var dashboard = {
      appCount: state.dashboard.appCount,
      apiCount: 0,
      docsCount: 0,
      apiMethodTotal: {},
      controllerGroupTotal: {},
      apiGroupTotal: {},
      apiTagTotal: {},
      apiAuthorTotal: {},
    }

    function walk(nodes) {
      ;(nodes || []).forEach(function (node) {
        if (node.controller && node.group) {
          var group = node.group
          var childCount = (node.children || []).length
          dashboard.apiGroupTotal[group] = (dashboard.apiGroupTotal[group] || 0) + childCount
          dashboard.controllerGroupTotal[group] =
            (dashboard.controllerGroupTotal[group] || 0) + 1
        } else if (node.url) {
          dashboard.apiCount++
          utils.methodList(node.method).forEach(function (method) {
            dashboard.apiMethodTotal[method] = (dashboard.apiMethodTotal[method] || 0) + 1
          })
          var tags = utils.isArray(node.tag) ? node.tag : node.tag ? String(node.tag).split(',') : []
          tags.forEach(function (tag) {
            dashboard.apiTagTotal[tag] = (dashboard.apiTagTotal[tag] || 0) + 1
          })
          if (node.author) {
            dashboard.apiAuthorTotal[node.author] =
              (dashboard.apiAuthorTotal[node.author] || 0) + 1
          }
        }
        if (node.children && node.children.length) walk(node.children)
      })
    }
    walk(state.apiMenus)

    function countDocs(nodes) {
      ;(nodes || []).forEach(function (node) {
        if (node.path) dashboard.docsCount++
        if (node.children && node.children.length) countDocs(node.children)
      })
    }
    countDocs(state.docsMenus)
    state.dashboard = dashboard
  }

  function loadApiMenus(params) {
    return AD.api
      .getApiMenus(
        Object.assign(
          {
            appKey: state.appKey,
            lang: state.lang,
            shareKey: state.shareKey,
          },
          params || {},
        ),
      )
      .then(function (data) {
        state.apiMenus = (data && data.data) || []
        state.apiMenuMeta = {
          app: data.app || null,
          groups: data.groups || [],
          tags: data.tags || [],
        }
        computeDashboard()
        return data
      })
  }

  function loadDocsMenus(params) {
    return AD.api
      .getDocMenus(
        Object.assign(
          {
            appKey: state.appKey,
            lang: state.lang,
            shareKey: state.shareKey,
          },
          params || {},
        ),
      )
      .then(function (data) {
        state.docsMenus = data || []
        computeDashboard()
        return data
      })
      .catch(function (error) {
        if (error.isAuth) throw error
        state.docsMenus = []
        return []
      })
  }

  function loadAllMenus(params) {
    return Promise.all([loadApiMenus(params), loadDocsMenus(params)])
  }

  function renderPage(route) {
    var content = contentEl()
    var page = route.path
    if (page === '/api') {
      AD.pages.apiDetail.render(content, route)
    } else if (page === '/md') {
      AD.pages.mdDetail.render(content, route)
    } else if (page === '/home' || page === '/') {
      AD.pages.home.render(content, route)
    } else {
      content.innerHTML =
        '<div class="ad-empty ad-empty-lg">' + escape(AD.t('common.pageNotFound')) + '</div>'
    }
  }

  function handleRoute(initial) {
    if (state.loading) return
    var route = AD.parseHash()
    state.currentKey = route.query.key || ''
    if (route.path === '/md') state.sideTab = 'docs'
    else if (route.path === '/api') state.sideTab = 'api'
    if (route.query.lang && route.query.lang !== state.lang) {
      AD.setLang(route.query.lang)
      state.lang = route.query.lang
    }
    if (route.query.shareKey && route.query.shareKey !== state.shareKey) {
      state.shareKey = route.query.shareKey
    }
    if (route.query.appKey && route.query.appKey !== state.appKey) {
      state.appKey = route.query.appKey
    }
    AD.tabs.open({
      path: route.path,
      query: route.query,
      title: route.query.title || (route.path === '/home' ? AD.t('home.title') : ''),
    })
    AD.sidebar.render()
    renderPage(route)
    if (!initial) window.scrollTo(0, 0)
    if (state.device === 'mobile') closeSide()
    AD.i18n.applyDom(document)
  }

  function openApi(node) {
    var query = {
      appKey: state.appKey,
      key: node.menuKey,
      title: node.title || node.name || '',
      lang: state.lang,
      shareKey: state.shareKey,
    }
    window.location.hash = AD.buildHash('/api', query)
    if (state.device === 'mobile') closeSide()
  }

  function openMd(node) {
    var query = {
      appKey: state.appKey,
      key: node.path || node.menuKey,
      title: node.title || node.name || '',
      lang: state.lang,
      shareKey: state.shareKey,
    }
    window.location.hash = AD.buildHash('/md', query)
    if (state.device === 'mobile') closeSide()
  }

  function changeApp(appKey) {
    AD.setAppKey(appKey)
    AD.pages.apiDetail.clearCache()
    var content = contentEl()
    content.innerHTML =
      '<div class="ad-skeleton"><div class="ad-skeleton-line w40"></div>' +
      '<div class="ad-skeleton-line w60"></div><div class="ad-skeleton-block"></div></div>'
    loadAllMenus()
      .then(function () {
        AD.sidebar.render()
        var homeHash = AD.buildHash('/home', {
          appKey: state.appKey,
          lang: state.lang,
          shareKey: state.shareKey,
        })
        if (window.location.hash === homeHash) handleRoute()
        else window.location.hash = homeHash
      })
      .catch(function (error) {
        showGlobalError(error)
      })
  }

  function reloadMenus() {
    var layer = layui.layer
    var loading = layer.load(2, { shade: 0.05 })
    loadAllMenus({ reload: true })
      .then(function () {
        layer.close(loading)
        AD.sidebar.render()
        if (AD.parseHash().path === '/home') {
          AD.pages.home.render(contentEl(), AD.parseHash())
        }
        layer.msg(AD.t('common.actionSuccess'), { icon: 1 })
      })
      .catch(function (error) {
        layer.close(loading)
        layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
      })
  }

  function renderLangSelect() {
    var container = document.getElementById('ad-lang-select')
    if (!container) return
    var langs = state.feConfig.LANG || []
    if (langs.length <= 1) {
      container.innerHTML = ''
      return
    }
    container.innerHTML =
      '<button type="button" class="ad-btn"><i class="layui-icon layui-icon-website"></i>' +
      '<span class="ad-btn-text">' + escape(AD.i18n.getLangConfig(state.lang).title || state.lang) + '</span>' +
      '<i class="layui-icon layui-icon-down"></i></button>'
    layui.use(['dropdown'], function () {
      layui.dropdown.render({
        elem: container.querySelector('.ad-btn'),
        data: langs.map(function (item) {
          return { title: item.title, id: item.lang }
        }),
        click: function (item) {
          if (item.id === state.lang) return
          var langConfig = AD.i18n.getLangConfig(item.id)
          layui.layer.confirm(
            AD.t('lang.change.confirm.title', { langTitle: langConfig.title }) + '<br>' +
              AD.t('lang.change.confirm.content'),
            { title: AD.t('common.tip'), btn: [AD.t('common.ok'), AD.t('common.cancel')] },
            function (index) {
              layui.layer.close(index)
              AD.setLang(item.id)
              var hash = AD.buildHash('/home', {
                appKey: state.appKey,
                lang: item.id,
                shareKey: state.shareKey,
              })
              window.location.hash = hash
              window.location.reload()
            },
          )
        },
      })
    })
  }

  function renderHostSelect() {
    var container = document.getElementById('ad-host-select')
    if (!container) return
    var hosts = state.feConfig.HTTP.HOSTS || []
    if (hosts.length <= 1) {
      container.innerHTML = ''
      return
    }
    var current = hosts.find(function (item) {
      return item.host === state.host
    }) || hosts[0]
    container.innerHTML =
      '<button type="button" class="ad-btn"><i class="layui-icon layui-icon-engine"></i>' +
      '<span class="ad-btn-text">' + escape(current ? current.title : AD.t('common.host')) + '</span>' +
      '<i class="layui-icon layui-icon-down"></i></button>'
    layui.use(['dropdown'], function () {
      layui.dropdown.render({
        elem: container.querySelector('.ad-btn'),
        data: hosts.map(function (item) {
          return { title: item.title, id: item.host }
        }),
        click: function (item) {
          if (item.id === (current && current.host)) return
          layui.layer.confirm(
            AD.t('host.change.confirm.title', { hostTitle: item.title }),
            { title: AD.t('common.tip'), btn: [AD.t('common.ok'), AD.t('common.cancel')] },
            function (index) {
              layui.layer.close(index)
              AD.setHost(item.id)
              window.location.reload()
            },
          )
        },
      })
    })
  }

  function renderTools() {
    var container = document.getElementById('ad-tools-select')
    if (!container) return
    var config = state.serverConfig || {}
    if (state.shareKey) {
      container.innerHTML = ''
      return
    }
    var tools = []
    if (config.generator && config.generator.length) {
      config.generator.forEach(function (item, index) {
        tools.push({
          title: AD.t('generator.title') + ' - ' + item.title,
          id: 'generator:' + index,
        })
      })
    }
    if (config.cache && config.cache.enable) {
      tools.push({ title: AD.t('cache.cancelAll'), id: 'cache:cancel' })
      tools.push({ title: AD.t('cache.createAllApi'), id: 'cache:create' })
    }
    if (config.code_template && config.code_template.length) {
      tools.push({ title: AD.t('codeTemplate.title'), id: 'codeTemplate' })
    }
    if (config.share && config.share.enable) {
      tools.push({ title: AD.t('apiShare.title'), id: 'apiShare' })
    }
    if (!tools.length) {
      container.innerHTML = ''
      return
    }
    container.innerHTML =
      '<button type="button" class="ad-btn"><i class="layui-icon layui-icon-app"></i>' +
      '<span class="ad-btn-text">' + escape(AD.t('tools.title')) + '</span>' +
      '<i class="layui-icon layui-icon-down"></i></button>'

    layui.use(['dropdown'], function () {
      layui.dropdown.render({
        elem: container.querySelector('.ad-btn'),
        data: tools,
        click: function (item) {
          var id = item.id
          var layer = layui.layer
          if (id.indexOf('generator:') === 0) {
            var index = Number(id.split(':')[1])
            AD.pages.generator.open(index, function () {
              reloadMenus()
            })
          } else if (id === 'cache:cancel') {
            layer.confirm(
              AD.t('cache.cancelAllConfirm'),
              { title: AD.t('common.tip'), btn: [AD.t('common.ok'), AD.t('common.cancel')] },
              function (confirmIndex) {
                layer.close(confirmIndex)
                AD.api
                  .cancelAllCache()
                  .then(function () {
                    layer.msg(AD.t('cache.cancelSuccess'), { icon: 1 })
                  })
                  .catch(function (error) {
                    layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
                  })
              },
            )
          } else if (id === 'cache:create') {
            layer.confirm(
              AD.t('cache.createAllConfirm'),
              { title: AD.t('common.tip'), btn: [AD.t('common.ok'), AD.t('common.cancel')] },
              function (confirmIndex) {
                layer.close(confirmIndex)
                layer.load(2, { shade: 0.05 })
                AD.api
                  .createAllCache()
                  .then(function () {
                    layer.closeAll('loading')
                    layer.msg(AD.t('cache.createSuccess'), { icon: 1 })
                  })
                  .catch(function (error) {
                    layer.closeAll('loading')
                    layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
                  })
              },
            )
          } else if (id === 'codeTemplate') {
            AD.pages.codeTemplate.open()
          } else if (id === 'apiShare') {
            AD.pages.apiShare.open()
          }
        },
      })
    })
  }

  function bindHeader() {
    document.getElementById('ad-theme-btn').addEventListener('click', function () {
      AD.setTheme(state.theme === 'dark' ? 'light' : 'dark')
      applyTheme()
    })
    document.getElementById('ad-global-params-btn').addEventListener('click', function () {
      AD.globalParams.openModal()
    })
    document.getElementById('ad-menu-toggle').addEventListener('click', function () {
      if (state.device === 'mobile') {
        if (document.body.classList.contains('ad-side-open')) closeSide()
        else openSide()
      } else {
        document.body.classList.toggle('ad-side-collapsed')
      }
    })
    var mask = document.getElementById('ad-side-mask')
    if (mask) mask.addEventListener('click', closeSide)
  }

  function bindEvents() {
    window.addEventListener('hashchange', function () {
      handleRoute()
    })
    window.addEventListener('resize', utils.debounce(applyDevice, 150))
    AD.tabs.bind()
    AD.sidebar.bind()
    bindHeader()
  }

  function loadExternal() {
    ;(state.feConfig.LOAD_SCRIPTS || []).forEach(function (src) {
      utils.loadScript(src)
    })
  }

  function setSiteTitle(config) {
    var title = (config && config.title) || state.feConfig.TITLE || 'Apidoc'
    document.title = title
    var logo = document.getElementById('ad-logo-title')
    if (logo) logo.textContent = title
  }

  function bootstrap() {
    var route = AD.initUrlState()
    applyTheme()
    applyDevice()
    applySideWidth()
    AD.i18n.applyDom(document)
    loadExternal()
    bindEvents()
    setSiteTitle(null)

    AD.api
      .getConfig({
        appKey: route.query.appKey || state.appKey || '',
        lang: state.lang,
        shareKey: state.shareKey,
      })
      .then(function (config) {
        state.serverConfig = config || {}
        AD.handleApps(state.serverConfig.apps || [])
        if (!state.appKey || !state.appObject[state.appKey]) {
          var cached = AD.storage.get('APP_KEY', '')
          state.appKey =
            cached && state.appObject[cached]
              ? cached
              : state.appList.length
              ? state.appList[0].appKey
              : ''
        }
        AD.setAppKey(state.appKey)
        AD.globalParams.initFromConfig(state.serverConfig)
        setSiteTitle(state.serverConfig)
        return loadAllMenus()
      })
      .then(function () {
        state.loading = false
        hideLoading()
        AD.sidebar.render()
        renderLangSelect()
        renderHostSelect()
        renderTools()
        handleRoute(true)
      })
      .catch(function (error) {
        state.loading = false
        showGlobalError(error)
        AD.auth.handleError(error).then(function (needRetry) {
          if (needRetry) window.location.reload()
        })
      })
  }

  AD.app = {
    loadApiMenus: loadApiMenus,
    loadDocsMenus: loadDocsMenus,
    loadAllMenus: loadAllMenus,
    reloadMenus: reloadMenus,
    openApi: openApi,
    openMd: openMd,
    changeApp: changeApp,
    handleRoute: handleRoute,
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap)
  } else {
    bootstrap()
  }
})()