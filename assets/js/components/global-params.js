(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  var TYPES = ['header', 'query', 'body']
  var activeType = 'header'
  var draft = null

  function ensureParams() {
    var state = AD.appState
    if (!state.globalParams || !state.globalParams.header) {
      state.globalParams = { header: [], query: [], body: [] }
    }
    return state.globalParams
  }

  function initFromConfig(serverConfig) {
    var state = AD.appState
    var cached = AD.storage.get('GLOBALPARAMS', {})
    var appObject = state.appObject
    var result = { header: [], query: [], body: [] }

    TYPES.forEach(function (type) {
      var usedCacheKeys = {}
      var list = []
      var cachedList = cached[type] || []
      var cachedByKey = {}
      cachedList.forEach(function (item) {
        cachedByKey[(item.appKey || '') + '_' + item.name] = item
      })

      function appendConfigParams(params, appKey, source) {
        ;(params || []).forEach(function (item) {
          var node = Object.assign({}, item)
          node.id = utils.createRandKey()
          node.appKey = appKey || 'all'
          node.addSource = source || 'config'
          node.require = true
          var cacheKey = node.appKey + '_' + node.name
          if (cachedByKey[cacheKey]) {
            node.value = cachedByKey[cacheKey].value
            usedCacheKeys[cacheKey] = true
          } else {
            node.value = node.default
          }
          list.push(node)
        })
      }

      if (serverConfig.params && serverConfig.params[type]) {
        appendConfigParams(serverConfig.params[type], 'all', 'config')
      }
      Object.keys(appObject).forEach(function (appKey) {
        var app = appObject[appKey]
        if (app.params && app.params[type]) {
          appendConfigParams(app.params[type], appKey, 'config')
        }
      })
      cachedList.forEach(function (item) {
        var cacheKey = (item.appKey || '') + '_' + item.name
        if (!usedCacheKeys[cacheKey] && item.addSource !== 'config') {
          list.push(item)
        }
      })
      result[type] = list
    })

    state.globalParams = result
    AD.setGlobalParams(result)
  }

  function setParam(type, key, value, desc, appKey) {
    var params = ensureParams()
    if (!params[type]) params[type] = []
    var targetAppKey = appKey || 'all'
    var found = params[type].find(function (item) {
      return (
        item.name === key &&
        (item.appKey === targetAppKey ||
          item.appKey === 'all' ||
          item.appKey === AD.appState.appKey)
      )
    })
    if (found) {
      found.value = value
    } else {
      params[type].push({
        id: utils.createRandKey(),
        name: key,
        value: value,
        desc: desc || '',
        appKey: targetAppKey,
      })
    }
    AD.setGlobalParams(Object.assign({}, params))
  }

  function removeParam(type, key) {
    var params = ensureParams()
    if (!params[type]) return
    params[type] = params[type].filter(function (item) {
      return item.name !== key
    })
    AD.setGlobalParams(Object.assign({}, params))
  }

  function appOptions(selected) {
    var html = '<option value="all">' + utils.escapeHtml(AD.t('common.allAppOption')) + '</option>'
    AD.appState.appList.forEach(function (app) {
      html +=
        '<option value="' + utils.escapeHtml(app.appKey) + '"' +
        (app.appKey === selected ? ' selected' : '') +
        '>' + utils.escapeHtml(app.fullTitle) + '</option>'
    })
    return html
  }

  function rowHtml(item) {
    return (
      '<tr data-id="' + utils.escapeHtml(item.id) + '">' +
      '<td><select class="ad-grid-select" data-field="appKey">' + appOptions(item.appKey) + '</select></td>' +
      '<td><input class="layui-input ad-grid-input" data-field="name" value="' + utils.escapeHtml(item.name) + '"></td>' +
      '<td><input class="layui-input ad-grid-input" data-field="value" value="' + utils.escapeHtml(item.value) + '"></td>' +
      '<td><input class="layui-input ad-grid-input" data-field="desc" value="' + utils.escapeHtml(item.desc) + '"></td>' +
      '<td class="ad-grid-center"><button type="button" class="ad-btn ad-btn-icon ad-btn-danger" data-action="delete">' +
      '<i class="layui-icon layui-icon-delete"></i></button></td>' +
      '</tr>'
    )
  }

  function renderTable(type) {
    var list = draft[type] || []
    var rows = list.map(rowHtml).join('')
    if (!rows) {
      rows = '<tr><td colspan="5" class="ad-grid-empty">' + utils.escapeHtml(AD.t('common.notdata')) + '</td></tr>'
    }
    return (
      '<table class="ad-grid" data-type="' + type + '">' +
      '<thead><tr>' +
      '<th style="width:170px">' + utils.escapeHtml(AD.t('common.appOrVersion')) + '</th>' +
      '<th style="width:150px">' + utils.escapeHtml(AD.t('common.field')) + '</th>' +
      '<th>' + utils.escapeHtml(AD.t('common.value')) + '</th>' +
      '<th style="width:240px">' + utils.escapeHtml(AD.t('common.desc')) + '</th>' +
      '<th style="width:60px">' + utils.escapeHtml(AD.t('common.action')) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>'
    )
  }

  function renderModalBody() {
    var tabs = ''
    var panels = ''
    TYPES.forEach(function (type, index) {
      tabs +=
        '<a class="ad-modal-tab' + (index === 0 ? ' active' : '') + '" data-type="' + type + '">' +
        utils.escapeHtml(AD.t('globalParam.' + type)) + '</a>'
      panels +=
        '<div class="ad-modal-panel' + (index === 0 ? ' active' : '') + '" data-type="' + type + '">' +
        '<div class="ad-alert">' + utils.escapeHtml(AD.t('globalParam.' + type + '.message')) + '</div>' +
        renderTable(type) +
        '<button type="button" class="ad-btn ad-btn-sm ad-mt" data-action="add">' +
        '<i class="layui-icon layui-icon-add-1"></i> ' + utils.escapeHtml(AD.t('globalParam.add')) +
        '</button></div>'
    })
    return '<div class="ad-modal-body"><div class="ad-modal-tabs">' + tabs + '</div>' + panels + '</div>'
  }

  function bindModalEvents(layerEl) {
    var currentTab = activeType

    function switchTab(type) {
      currentTab = type
      layerEl.find('.ad-modal-tab').removeClass('active').filter('[data-type="' + type + '"]').addClass('active')
      layerEl.find('.ad-modal-panel').removeClass('active').filter('[data-type="' + type + '"]').addClass('active')
    }
    if (currentTab !== 'header') switchTab(currentTab)

    layerEl.find('.ad-modal-tab').on('click', function () {
      switchTab(this.getAttribute('data-type'))
    })

    layerEl.find('.ad-modal-panel').on('click', '[data-action="add"]', function () {
      draft[currentTab].push({
        id: utils.createRandKey(),
        appKey: 'all',
        name: '',
        value: '',
        desc: '',
      })
      layerEl.find('.ad-modal-panel[data-type="' + currentTab + '"]').html(
        '<div class="ad-alert">' + utils.escapeHtml(AD.t('globalParam.' + currentTab + '.message')) + '</div>' +
        renderTable(currentTab) +
        '<button type="button" class="ad-btn ad-btn-sm ad-mt" data-action="add">' +
        '<i class="layui-icon layui-icon-add-1"></i> ' + utils.escapeHtml(AD.t('globalParam.add')) +
        '</button>',
      )
    })

    layerEl.find('.ad-modal-panel').on('click', '[data-action="delete"]', function () {
      var row = this.closest('tr')
      var id = row.getAttribute('data-id')
      draft[currentTab] = draft[currentTab].filter(function (item) {
        return item.id !== id
      })
      row.parentNode.removeChild(row)
    })

    layerEl.find('.ad-modal-panel').on('input change', '[data-field]', function () {
      var row = this.closest('tr')
      var id = row.getAttribute('data-id')
      var field = this.getAttribute('data-field')
      var item = draft[currentTab].find(function (p) {
        return p.id === id
      })
      if (item) item[field] = this.value
    })
  }

  function openModal() {
    draft = utils.deepClone(ensureParams())
    TYPES.forEach(function (type) {
      if (!draft[type]) draft[type] = []
    })
    layui.use(['layer'], function () {
      var layer = layui.layer
      var index = layer.open({
        type: 1,
        title: AD.t('globalParam.title'),
        area: ['900px', '75%'],
        shadeClose: false,
        content: renderModalBody(),
        btn: [AD.t('common.ok'), AD.t('common.cancel')],
        success: function (layerEl) {
          bindModalEvents(layerEl)
        },
        yes: function (index) {
          AD.setGlobalParams(utils.deepClone(draft))
          layer.close(index)
          layer.msg(AD.t('common.actionSuccess'), { icon: 1 })
        },
      })
      return index
    })
  }

  AD.globalParams = {
    initFromConfig: initFromConfig,
    setParam: setParam,
    removeParam: removeParam,
    openModal: openModal,
    ensureParams: ensureParams,
  }
})()