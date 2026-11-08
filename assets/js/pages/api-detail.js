(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils
  var detailCache = {}
  var debugCache = {}

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function detailCacheKey(route) {
    return (route.query.appKey || AD.appState.appKey) + '_' + route.query.key
  }

  function skeleton(container) {
    container.innerHTML =
      '<div class="ad-skeleton">' +
      '<div class="ad-skeleton-line w40"></div>' +
      '<div class="ad-skeleton-line w60"></div>' +
      '<div class="ad-skeleton-line w90"></div>' +
      '<div class="ad-skeleton-block"></div>' +
      '</div>'
  }

  function errorCard(container, error) {
    container.innerHTML =
      '<div class="ad-error-card">' +
      '<h3>' + escape(AD.t('common.error')) + '</h3>' +
      '<p>' + escape((error.data && error.data.message) || error.message || '') + '</p>' +
      '</div>'
  }

  function createCodeBlock(title, code, language) {
    var wrap = document.createElement('div')
    wrap.className = 'ad-code-block'
    var head = document.createElement('div')
    head.className = 'ad-code-head'
    head.innerHTML =
      '<span>' + escape(title) + '</span>' +
      '<button type="button" class="ad-btn ad-btn-sm" data-copy-code>' +
      escape(AD.t('common.copy')) + '</button>'
    var pre = document.createElement('pre')
    pre.className = 'ad-pre'
    var codeEl = document.createElement('code')
    codeEl.className = 'language-' + (language || 'text')
    codeEl.textContent = code || ''
    pre.appendChild(codeEl)
    wrap.appendChild(head)
    wrap.appendChild(pre)
    if (window.hljs) {
      try {
        window.hljs.highlightElement(codeEl)
      } catch (e) {
        // ignore
      }
    }
    head.querySelector('[data-copy-code]').addEventListener('click', function () {
      utils.copyText(code || '').then(function () {
        layui.layer.msg(AD.t('common.copySuccess'), { icon: 1 })
      })
    })
    return wrap
  }

  function methodBadge(methods, current) {
    if (!methods.length) return '<span class="ad-api-method">API</span>'
    var color = utils.methodColor(current) || '#8c8c8c'
    return (
      '<span class="ad-api-method" style="background:' + color + '">' +
      escape(current) + '</span>'
    )
  }

  function renderHead(page, detail, route, ctx) {
    var head = document.createElement('div')
    head.className = 'ad-api-head'
    var methods = utils.methodList(detail.method)
    var tags = utils.isArray(detail.tag) ? detail.tag : detail.tag ? [detail.tag] : []
    var html =
      '<div class="ad-api-title-row">' +
      '<h1>' + escape(detail.title || detail.name || '') + '</h1>' +
      '<button type="button" class="ad-btn" data-action="reload">' +
      '<i class="layui-icon layui-icon-refresh"></i> ' + escape(AD.t('apiPage.reload.button')) +
      '</button></div>'
    if (detail.author || tags.length) {
      html += '<div class="ad-api-meta">'
      if (detail.author) {
        html += '<span class="ad-meta-item">' + escape(AD.t('common.author')) + '：' + escape(detail.author) + '</span>'
      }
      tags.forEach(function (tag) {
        html += '<span class="ad-meta-tag">' + escape(tag) + '</span>'
      })
      html += '</div>'
    }
    html +=
      '<div class="ad-api-url">' +
      '<div class="ad-api-method-box" data-method-box></div>' +
      '<input type="text" readonly value="' + escape(detail.url || '') + '">' +
      '<button type="button" class="ad-btn ad-btn-icon" data-action="copy-url" title="' +
      escape(AD.t('common.copyUrl')) + '"><i class="layui-icon layui-icon-file-b"></i></button>' +
      '</div>'
    head.innerHTML = html

    var methodBox = head.querySelector('[data-method-box]')
    if (methods.length > 1) {
      ctx.currentMethod = ctx.currentMethod || methods[0]
      var select = document.createElement('select')
      select.className = 'ad-api-method-select'
      select.innerHTML = methods
        .map(function (method) {
          return '<option value="' + escape(method) + '"' +
            (method === ctx.currentMethod ? ' selected' : '') + '>' + escape(method) + '</option>'
        })
        .join('')
      select.addEventListener('change', function () {
        ctx.currentMethod = select.value
        select.style.color = utils.methodColor(ctx.currentMethod)
      })
      select.style.color = utils.methodColor(ctx.currentMethod)
      methodBox.appendChild(select)
    } else {
      ctx.currentMethod = methods[0] || ''
      methodBox.innerHTML = methodBadge(methods, ctx.currentMethod)

    }

    head.querySelector('[data-action="copy-url"]').addEventListener('click', function () {
      utils.copyText(detail.url || '').then(function () {
        layui.layer.msg(AD.t('common.copySuccess'), { icon: 1 })
      })
    })
    head.querySelector('[data-action="reload"]').addEventListener('click', function () {
      delete detailCache[detailCacheKey(route)]
      render(document.getElementById('ad-content'), route, true)
    })
    page.appendChild(head)
  }

  function renderTablePanel(panel, detail) {
    var CUSTOM = AD.appState.feConfig.CUSTOM_METHODS || {}
    var desc = detail.desc || ''
    if (typeof CUSTOM.HANDEL_API_DESC === 'function') desc = CUSTOM.HANDEL_API_DESC(desc)
    if (desc) {
      var descBlock = document.createElement('div')
      descBlock.className = 'ad-api-desc'
      descBlock.innerHTML = utils.textToHtml(desc)
      panel.appendChild(descBlock)
    }
    if (detail.md) {
      var md = detail.md
      if (typeof CUSTOM.HANDEL_API_MD === 'function') md = CUSTOM.HANDEL_API_MD(md)
      panel.appendChild(AD.markdown.render(md))
    }
    AD.apiTable.renderParams(panel, detail.header, { title: AD.t('apiPage.header.title') })
    AD.apiTable.renderParams(panel, detail.routeParam, { title: AD.t('apiPage.routeParam.title') })
    AD.apiTable.renderParams(panel, detail.query, { title: AD.t('apiPage.query.title') })
    AD.apiTable.renderParams(panel, detail.param, { title: AD.t('apiPage.body.title') })
    AD.apiTable.renderResponses(panel, detail)
    var empty =
      !(detail.header && detail.header.length) &&
      !(detail.routeParam && detail.routeParam.length) &&
      !(detail.query && detail.query.length) &&
      !(detail.param && detail.param.length) &&
      !(detail.responseSuccess && detail.responseSuccess.length) &&
      !(detail.responseError && detail.responseError.length) &&
      !(detail.responseStatus && detail.responseStatus.length)
    if (empty) {
      panel.innerHTML =
        '<div class="ad-empty">' + escape(AD.t('common.notdata')) + '</div>'
    }
  }

  function renderJsonPanel(panel, detail) {
    var sections = [
      { title: AD.t('apiPage.header.title'), params: detail.header },
      { title: AD.t('apiPage.routeParam.title'), params: detail.routeParam },
      { title: AD.t('apiPage.query.title'), params: detail.query },
      { title: AD.t('apiPage.body.title'), params: detail.param },
    ]
    var hasData = false
    sections.forEach(function (section) {
      if (section.params && section.params.length) {
        hasData = true
        var json = AD.code.renderCodeJsonByParams(section.params)
        panel.appendChild(
          createCodeBlock(section.title, AD.code.formatJson(json), 'json'),
        )
      }
    })
    if (detail.responseSuccess && detail.responseSuccess.length) {
      hasData = true
      panel.appendChild(
        createCodeBlock(
          AD.t('apiPage.responses'),
          AD.code.formatJson(AD.code.renderCodeJsonByParams(detail.responseSuccess)),
          'json',
        ),
      )
    }
    if (!hasData) {
      panel.innerHTML = '<div class="ad-empty">' + escape(AD.t('common.notdata')) + '</div>'
    }
  }

  function renderTsPanel(panel, detail) {
    var sections = [
      { title: AD.t('apiPage.routeParam.title'), params: detail.routeParam },
      { title: AD.t('apiPage.query.title'), params: detail.query },
      { title: AD.t('apiPage.body.title'), params: detail.param },
    ]
    var hasData = false
    sections.forEach(function (section) {
      if (section.params && section.params.length) {
        hasData = true
        panel.appendChild(
          createCodeBlock(section.title, AD.code.transformTypeScript(section.params), 'typescript'),
        )
      }
    })
    if (detail.responseSuccess && detail.responseSuccess.length) {
      hasData = true
      panel.appendChild(
        createCodeBlock(
          AD.t('apiPage.responses'),
          AD.code.transformTypeScript(detail.responseSuccess),
          'typescript',
        ),
      )
    }
    if (!hasData) {
      panel.innerHTML = '<div class="ad-empty">' + escape(AD.t('common.notdata')) + '</div>'
    }
  }

  function paramRowHtml(item, type) {
    var isFile = item.type === 'file'
    var isFiles = item.type === 'files'
    var nameEditable = type === 'query' || type === 'body'
    var valueHtml = ''
    if (isFile) {
      valueHtml =
        '<label class="ad-file-input"><input type="file" data-field="default" data-file="single">' +
        '<span>' + escape(AD.t('apiPage.debug.selectFile')) + '</span></label>'
    } else if (isFiles) {
      valueHtml =
        '<label class="ad-file-input"><input type="file" multiple data-field="default" data-file="multi">' +
        '<span>' + escape(AD.t('apiPage.debug.selectFiles')) + '</span></label>'
    } else {
      var value = item.default === undefined || item.default === null ? '' : item.default
      if (typeof value === 'object') value = JSON.stringify(value)
      valueHtml =
        '<input class="layui-input ad-grid-input" data-field="default" value="' + escape(value) + '">'
    }
    var requireHtml =
      item.require === true || item.require === 1 || item.require === '1'
        ? '<i class="layui-icon layui-icon-ok ad-require-ok"></i>'
        : ''
    var deletable = type === 'query' || type === 'body'
    return (
      '<tr data-id="' + escape(item.id) + '">' +
      '<td>' +
      (nameEditable
        ? '<input class="layui-input ad-grid-input" data-field="name" value="' + escape(item.name || '') + '">'
        : '<span class="ad-cell-mono">' + escape(item.name || '') + '</span>') +
      '</td>' +
      '<td>' + valueHtml + '</td>' +
      '<td class="ad-grid-center">' + requireHtml + '</td>' +
      '<td><span class="ad-cell-desc">' + utils.textToHtml(item.desc || '') + '</span></td>' +
      '<td class="ad-grid-center">' +
      (deletable
        ? '<button type="button" class="ad-btn ad-btn-icon ad-btn-danger" data-action="delete">' +
          '<i class="layui-icon layui-icon-delete"></i></button>'
        : '') +
      '</td></tr>'
    )
  }

  function renderParamTable(items, type) {
    var rows = (items || []).map(function (item) {
      return paramRowHtml(item, type)
    })
    if (!rows.length) {
      rows = '<tr><td colspan="5" class="ad-grid-empty">' + escape(AD.t('common.notdata')) + '</td></tr>'
    }
    return (
      '<table class="ad-grid ad-debug-grid" data-param-type="' + type + '">' +
      '<thead><tr>' +
      '<th style="width:200px">' + escape(AD.t('apiPage.common.field')) + '</th>' +
      '<th>' + escape(AD.t('apiPage.common.value')) + '</th>' +
      '<th style="width:70px">' + escape(AD.t('apiPage.common.require')) + '</th>' +
      '<th style="width:180px">' + escape(AD.t('apiPage.common.desc')) + '</th>' +
      '<th style="width:60px">' + escape(AD.t('apiPage.common.action')) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      (type === 'query' || type === 'body'
        ? '<button type="button" class="ad-btn ad-btn-sm ad-mt" data-action="add-param">' +
          '<i class="layui-icon layui-icon-add-1"></i> ' + escape(AD.t('globalParam.add')) + '</button>'
        : '')
    )
  }

  function initDebugState(detail, key) {
    if (debugCache[key]) return debugCache[key]
    var ds = {
      activeType: 'body',
      header: AD.debug.renderHeaderData(detail),
      routeParam: AD.debug.renderRouteData(detail),
      query: AD.debug.renderQueryData(detail),
      body: AD.debug.renderBodyData(detail),
    }
    if (detail.routeParam && detail.routeParam.length) {
      ds.activeType = 'routeParam'
    } else if (String(detail.method || '').toUpperCase() === 'GET' && typeof ds.body === 'string') {
      ds.activeType = 'query'
    }
    debugCache[key] = ds
    return ds
  }

  function bindParamTable(tableWrap, ds, type, rerender) {
    tableWrap.addEventListener('input', function (event) {
      var input = event.target.closest('[data-field]')
      if (!input) return
      var row = input.closest('tr')
      if (!row) return
      var id = row.getAttribute('data-id')
      var field = input.getAttribute('data-field')
      var list = ds[type] || []
      var item = list.find(function (p) {
        return p.id === id
      })
      if (item) item[field] = input.value
    })
    tableWrap.addEventListener('change', function (event) {
      var input = event.target.closest('input[type="file"]')
      if (!input) return
      var row = input.closest('tr')
      var id = row.getAttribute('data-id')
      var list = ds[type] || []
      var item = list.find(function (p) {
        return p.id === id
      })
      if (!item) return
      item.default = Array.prototype.slice.call(input.files || [])
    })
    tableWrap.addEventListener('click', function (event) {
      var deleteBtn = event.target.closest('[data-action="delete"]')
      if (deleteBtn) {
        var row = deleteBtn.closest('tr')
        var id = row.getAttribute('data-id')
        ds[type] = (ds[type] || []).filter(function (p) {
          return p.id !== id
        })
        rerender()
        return
      }
      if (event.target.closest('[data-action="add-param"]')) {
        if (Array.isArray(ds[type])) {
          ds[type].push({
            id: utils.createRandKey(),
            name: '',
            default: '',
            desc: '',
            require: false,
            type: 'string',
          })
          rerender()
        }
      }
    })
  }

  function renderDebugPanel(panel, detail, route) {
    var key = detailCacheKey(route)
    var ds = initDebugState(detail, key)
    panel.innerHTML = ''

    var types = [
      { key: 'header', title: AD.t('apiPage.debug.header') },
      { key: 'routeParam', title: AD.t('apiPage.debug.routeParam'), hidden: !(detail.routeParam && detail.routeParam.length) },
      { key: 'query', title: AD.t('apiPage.debug.query') },
      { key: 'body', title: AD.t('apiPage.debug.body') },
    ].filter(function (item) {
      return !item.hidden
    })

    var tabs = document.createElement('div')
    tabs.className = 'ad-subtabs ad-debug-tabs'
    tabs.innerHTML =
      '<div class="ad-subtab-list">' +
      types
        .map(function (item) {
          return '<a class="ad-subtab' + (item.key === ds.activeType ? ' active' : '') +
            '" data-type="' + item.key + '">' + escape(item.title) + '</a>'
        })
        .join('') +
      '</div>' +
      '<button type="button" class="ad-btn ad-btn-sm" data-action="reset-all">' +
      '<i class="layui-icon layui-icon-refresh-3"></i> ' + escape(AD.t('apiPage.debug.param.reload')) +
      '</button>'
    panel.appendChild(tabs)

    var bodyBox = document.createElement('div')
    bodyBox.className = 'ad-debug-body'
    panel.appendChild(bodyBox)

    function renderCurrent() {
      bodyBox.innerHTML = ''
      var type = ds.activeType
      if (type === 'body' && typeof ds.body === 'string') {
        var editorWrap = document.createElement('div')
        editorWrap.className = 'ad-json-editor'
        var textarea = document.createElement('textarea')
        textarea.className = 'layui-textarea ad-json-textarea'
        textarea.value = ds.body
        textarea.spellcheck = false
        textarea.addEventListener('input', function () {
          ds.body = textarea.value
        })
        editorWrap.appendChild(textarea)
        var actions = document.createElement('div')
        actions.className = 'ad-json-editor-actions'
        actions.innerHTML =
          '<button type="button" class="ad-btn ad-btn-sm" data-action="format">' +
          '<i class="layui-icon layui-icon-fonts-code"></i> JSON</button>'
        actions.querySelector('[data-action="format"]').addEventListener('click', function () {
          try {
            ds.body = AD.code.formatJson(utils.parseJson(textarea.value))
            textarea.value = ds.body
            layui.layer.msg(AD.t('common.actionSuccess'), { icon: 1, time: 800 })
          } catch (e) {
            layui.layer.msg(AD.t('apiPage.json.formatError'), { icon: 2 })
          }
        })
        editorWrap.appendChild(actions)
        bodyBox.appendChild(editorWrap)
      } else {
        var list = ds[type]
        if (typeof list === 'string') list = []
        var tableWrap = document.createElement('div')
        tableWrap.innerHTML = renderParamTable(list, type)
        bodyBox.appendChild(tableWrap)
        bindParamTable(tableWrap, ds, type, function () {
          renderCurrent()
        })
      }
    }
    renderCurrent()

    tabs.addEventListener('click', function (event) {
      var tab = event.target.closest('.ad-subtab')
      if (tab) {
        ds.activeType = tab.getAttribute('data-type')
        tabs.querySelectorAll('.ad-subtab').forEach(function (item) {
          item.classList.remove('active')
        })
        tab.classList.add('active')
        renderCurrent()
      }
      if (event.target.closest('[data-action="reset-all"]')) {
        debugCache[key] = null
        delete debugCache[key]
        var fresh = initDebugState(detail, key)
        Object.keys(fresh).forEach(function (field) {
          ds[field] = fresh[field]
        })
        tabs.querySelectorAll('.ad-subtab').forEach(function (item) {
          item.classList.toggle('active', item.getAttribute('data-type') === ds.activeType)
        })
        renderCurrent()
      }
    })

    var executeBar = document.createElement('div')
    executeBar.className = 'ad-debug-actions'
    executeBar.innerHTML =
      '<button type="button" class="layui-btn ad-execute-btn" data-action="execute">' +
      escape(AD.t('apiPage.debug.excute')) + '</button>' +
      '<button type="button" class="layui-btn layui-btn-primary ad-execute-btn" data-action="reset-execute">' +
      escape(AD.t('apiPage.debug.reloadParamsAndExcute')) + '</button>'
    panel.appendChild(executeBar)

    var resultBox = document.createElement('div')
    resultBox.className = 'ad-debug-result'
    resultBox.innerHTML =
      '<div class="ad-empty ad-empty-sm">' + escape(AD.t('apiPage.debug.notExcute')) + '</div>'
    panel.appendChild(resultBox)

    var pageCtx = panel.__ctx
    executeBar.querySelector('[data-action="execute"]').addEventListener('click', function () {
      runDebug(detail, ds, pageCtx, resultBox)
    })
    executeBar.querySelector('[data-action="reset-execute"]').addEventListener('click', function () {
      delete debugCache[key]
      var fresh = initDebugState(detail, key)
      Object.keys(fresh).forEach(function (field) {
        ds[field] = fresh[field]
      })
      renderCurrent()
      runDebug(detail, ds, pageCtx, resultBox)
    })
  }

  function runDebug(detail, ds, ctx, resultBox) {
    var layer = layui.layer
    var loading = layer.load(2, { shade: 0.1 })
    AD.debug
      .execute(detail, ds, { method: ctx.currentMethod })
      .then(function (result) {
        layer.close(loading)
        renderDebugResult(resultBox, result)
      })
      .catch(function (error) {
        layer.close(loading)
        renderDebugResult(resultBox, error)
      })
  }

  function eventTitle(event) {
    var key = 'debug.event.' + event.event
    var text = AD.t(key)
    return text === key ? AD.t('debug.event.custom') + event.event : text
  }

  function eventListHtml(list) {
    if (!(list && list.length)) {
      return '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.notdata')) + '</div>'
    }
    return (
      '<ul class="ad-event-list">' +
      list
        .map(function (item) {
          var status = item.status === 'success' ? 'success' : item.status === 'error' ? 'error' : 'default'
          var detailText = ''
          if (item.event === 'ajax') {
            detailText = 'ajax("' + escape(item.url || '') + '")'
            if (item.before && item.before.length) {
              detailText += '<div class="ad-event-sub">' + item.before.map(function (sub) {
                return '<div>Before ' + escape(eventTitle(sub)) + '：' + escape(sub.key || '') +
                  (sub.value !== undefined ? ' = ' + escape(sub.value) : '') + '</div>'
              }).join('') + '</div>'
            }
            if (item.after && item.after.length) {
              detailText += '<div class="ad-event-sub">' + item.after.map(function (sub) {
                return '<div>After ' + escape(eventTitle(sub)) + '：' + escape(sub.key || '') +
                  (sub.value !== undefined ? ' = ' + escape(sub.value) : '') + '</div>'
              }).join('') + '</div>'
            }
          } else {
            var value = item.realValue !== undefined && item.realValue !== '' ? item.realValue : item.value
            detailText =
              escape(item.key || '') +
              (value !== undefined && value !== '' ? ' = ' + escape(typeof value === 'object' ? JSON.stringify(value) : value) : '')
          }
          return (
            '<li class="ad-event-item ' + status + '">' +
            '<span class="ad-event-dot"></span>' +
            '<div><div class="ad-event-name">' + escape(eventTitle(item)) + '</div>' +
            '<div class="ad-event-detail">' + detailText +
            (item.message ? '<span class="ad-event-message">' + escape(item.message) + '</span>' : '') +
            '</div></div></li>'
          )
        })
        .join('') +
      '</ul>'
    )
  }

  function renderDebugResult(container, result) {
    var layer = layui.layer
    var data = result || {}
    var isError = !data.status || data.status < 200 || data.status >= 300
    var tabs = [
      { key: 'response', title: AD.t('apiPage.responses') },
    ]
    if (data.beforeEvents || (data.beforeEvents && data.beforeEvents.list)) {
      tabs.push({ key: 'before', title: AD.t('debug.event.before') })
    }
    if (data.afterEvents) {
      tabs.push({ key: 'after', title: AD.t('debug.event.after') })
    }

    container.innerHTML = ''
    var head = document.createElement('div')
    head.className = 'ad-debug-result-head'
    head.innerHTML =
      '<span class="ad-status-badge ' + (isError ? 'error' : 'success') + '">' +
      escape(data.status || 0) + ' ' + escape(data.statusText || '') + '</span>' +
      '<span class="ad-debug-time">' + escape(AD.t('common.time')) + '：' +
      escape(data.timer === undefined ? '-' : data.timer + ' ' + AD.t('common.ms')) + '</span>' +
      (data.responseTime ? '<span class="ad-debug-time">' + escape(data.responseTime) + '</span>' : '')
    container.appendChild(head)

    var tabBar = document.createElement('div')
    tabBar.className = 'ad-subtabs'
    tabBar.innerHTML =
      '<div class="ad-subtab-list">' +
      tabs
        .map(function (tab, index) {
          return '<a class="ad-subtab' + (index === 0 ? ' active' : '') + '" data-key="' + tab.key + '">' +
            escape(tab.title) + '</a>'
        })
        .join('') +
      '</div>'
    container.appendChild(tabBar)

    var panel = document.createElement('div')
    panel.className = 'ad-debug-result-panel'
    container.appendChild(panel)

    function renderTab(key) {
      panel.innerHTML = ''
      if (key === 'response') {
        if (data.status === undefined) {
          panel.innerHTML =
            '<div class="ad-error-card ad-error-inline"><h3>' + escape(AD.t('common.error')) + '</h3><p>' +
            escape(data.message || '') + '</p></div>'
          return
        }
        if (typeof data.data === 'string') {
          var raw = document.createElement('pre')
          raw.className = 'ad-pre'
          raw.textContent = data.data
          panel.appendChild(raw)
        } else {
          panel.appendChild(
            createCodeBlock(AD.t('apiPage.responses'), AD.code.formatJson(data.data), 'json'),
          )
        }
        if (data.headers && Object.keys(data.headers).length) {
          var details = document.createElement('details')
          details.className = 'ad-headers-details'
          details.innerHTML =
            '<summary>' + escape(AD.t('common.responseHeader')) + '</summary>' +
            '<pre class="ad-pre">' + escape(JSON.stringify(data.headers, null, 2)) + '</pre>'
          panel.appendChild(details)
        }
      } else if (key === 'before') {
        panel.innerHTML = eventListHtml((data.beforeEvents && data.beforeEvents.list) || [])
      } else if (key === 'after') {
        panel.innerHTML = eventListHtml((data.afterEvents && data.afterEvents.list) || [])
      }
    }
    renderTab('response')

    tabBar.addEventListener('click', function (event) {
      var tab = event.target.closest('.ad-subtab')
      if (!tab) return
      tabBar.querySelectorAll('.ad-subtab').forEach(function (item) {
        item.classList.remove('active')
      })
      tab.classList.add('active')
      renderTab(tab.getAttribute('data-key'))
    })
  }

  function render(container, route, forceReload) {
    var state = AD.appState
    var cacheKey = detailCacheKey(route)
    var cached = forceReload ? null : detailCache[cacheKey]
    if (cached) {
      renderDetail(container, route, cached)
      return
    }
    skeleton(container)
    AD.api
      .getApiDetail({
        appKey: route.query.appKey || state.appKey,
        path: route.query.key,
        lang: route.query.lang || state.lang,
        shareKey: route.query.shareKey || state.shareKey,
      })
      .then(function (detail) {
        detailCache[cacheKey] = detail
        renderDetail(container, route, detail)
      })
      .catch(function (error) {
        errorCard(container, error)
        AD.auth.handleError(error)
      })
  }

  function renderDetail(container, route, detail) {
    var state = AD.appState
    container.innerHTML = ''
    var page = document.createElement('div')
    page.className = 'ad-api-page'
    var ctx = { currentMethod: '' }
    page.__ctx = ctx
    renderHead(page, detail, route, ctx)

    var tabs = document.createElement('div')
    tabs.className = 'ad-api-tabs'
    var configured = state.feConfig.API_DETAIL_TABS || ['table', 'json', 'ts', 'debug']
    var allowed = ['table', 'json', 'ts', 'debug']
    var tabKeys = configured.filter(function (key) {
      if (allowed.indexOf(key) < 0) return false
      if (key === 'debug' && detail.notDebug) return false
      return true
    })
    if (!tabKeys.length) tabKeys = ['table']
    var activeTab = tabKeys[0]
    tabs.innerHTML = tabKeys
      .map(function (key, index) {
        return '<a class="ad-api-tab' + (index === 0 ? ' active' : '') + '" data-tab="' + key + '">' +
          escape(AD.t('apiPage.tabs.' + key)) + '</a>'
      })
      .join('')
    page.appendChild(tabs)

    var panels = document.createElement('div')
    panels.className = 'ad-api-panels'
    page.appendChild(panels)
    container.appendChild(page)

    var panelMap = {}
    function ensurePanel(key) {
      if (panelMap[key]) return panelMap[key]
      var panel = document.createElement('div')
      panel.className = 'ad-api-panel'
      panel.setAttribute('data-panel', key)
      panel.style.display = tabKeys[activeTab] === key ? '' : 'none'
      panels.appendChild(panel)
      panelMap[key] = panel
      if (key === 'table') renderTablePanel(panel, detail)
      else if (key === 'json') renderJsonPanel(panel, detail)
      else if (key === 'ts') renderTsPanel(panel, detail)
      else if (key === 'debug') {
        panel.__ctx = ctx
        renderDebugPanel(panel, detail, route)
      }
      return panel
    }
    ensurePanel(activeTab)

    tabs.addEventListener('click', function (event) {
      var tab = event.target.closest('.ad-api-tab')
      if (!tab) return
      var key = tab.getAttribute('data-tab')
      activeTab = key
      tabs.querySelectorAll('.ad-api-tab').forEach(function (item) {
        item.classList.remove('active')
      })
      tab.classList.add('active')
      Object.keys(panelMap).forEach(function (panelKey) {
        panelMap[panelKey].style.display = panelKey === key ? '' : 'none'
      })
      ensurePanel(key)
      setTimeout(function () {
        AD.apiTable.refresh()
      }, 30)
    })

    AD.apiTable.bindMdLinks(page)
    setTimeout(function () {
      AD.apiTable.refresh()
    }, 50)
  }

  AD.pages = AD.pages || {}
  AD.pages.apiDetail = {
    render: render,
    clearCache: function () {
      detailCache = {}
      debugCache = {}
    },
  }
})()