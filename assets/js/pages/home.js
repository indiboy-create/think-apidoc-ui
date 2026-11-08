(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function renderGroupRows(groups, dashboard) {
    var controllerTotal = dashboard.controllerGroupTotal || {}
    var apiTotal = dashboard.apiGroupTotal || {}
    var rows = []
    function walk(list, level) {
      ;(list || []).forEach(function (item) {
        rows.push(
          '<tr class="ad-group-level-' + level + '">' +
          '<td>' + escape(item.title) + '</td>' +
          '<td>' + escape(controllerTotal[item.name] || 0) + '</td>' +
          '<td>' + escape(apiTotal[item.name] || 0) + '</td>' +
          '</tr>',
        )
        if (item.children && item.children.length) walk(item.children, level + 1)
      })
    }
    walk(groups, 0)
    if (!rows.length) {
      return '<tr><td colspan="3" class="ad-grid-empty">' + escape(AD.t('common.notdata')) + '</td></tr>'
    }
    return rows.join('')
  }

  function methodBars(methods) {
    var keys = Object.keys(methods || {})
    if (!keys.length) {
      return '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.notdata')) + '</div>'
    }
    var max = Math.max.apply(
      Math,
      keys.map(function (key) {
        return methods[key]
      }),
    )
    return keys
      .map(function (key) {
        var color = utils.methodColor(key)
        var width = max ? Math.round((methods[key] / max) * 100) : 0
        return (
          '<div class="ad-method-row">' +
          '<div class="ad-method-label"><span style="color:' + color + '">' + escape(key) + '</span>' +
          '<b>' + methods[key] + '</b></div>' +
          '<div class="ad-method-track"><span style="width:' + width + '%;background:' + color + '"></span></div>' +
          '</div>'
        )
      })
      .join('')
  }

  function tagCloud(tags) {
    var keys = Object.keys(tags || {})
    if (!keys.length) {
      return '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.notdata')) + '</div>'
    }
    return (
      '<div class="ad-tag-cloud">' +
      keys
        .map(function (key) {
          return '<span class="ad-tag">' + escape(key) + ' <b>' + tags[key] + '</b></span>'
        })
        .join('') +
      '</div>'
    )
  }

  function authorList(authors, apiCount) {
    var keys = Object.keys(authors || {})
    if (!keys.length) {
      return '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.notdata')) + '</div>'
    }
    return keys
      .map(function (key) {
        var percent = apiCount ? Math.min(100, Math.round((authors[key] / apiCount) * 100)) : 0
        return (
          '<div class="ad-author-row">' +
          '<span class="ad-author-name">' + escape(key) + '</span>' +
          '<span class="ad-author-track"><i style="width:' + percent + '%"></i></span>' +
          '<b>' + authors[key] + '</b>' +
          '</div>'
        )
      })
      .join('')
  }

  function render(container) {
    var state = AD.appState
    var serverConfig = state.serverConfig || {}
    var dashboard = state.dashboard
    var app = state.appObject[state.appKey]
    var title = serverConfig.title || state.feConfig.TITLE || 'Apidoc'
    var groups = (app && app.groups) || []

    container.innerHTML =
      '<div class="ad-home">' +
      '<div class="ad-home-hero">' +
      '<h1>' + escape(title) + '</h1>' +
      (serverConfig.desc ? '<p>' + utils.textToHtml(serverConfig.desc) + '</p>' : '') +
      '</div>' +
      '<div class="ad-stat-grid">' +
      '<div class="ad-stat-card"><div class="ad-stat-icon ad-stat-orange">APP</div><div><b>' +
      dashboard.appCount + '</b><span>' + escape(AD.t('home.appCount')) + '</span></div></div>' +
      '<div class="ad-stat-card"><div class="ad-stat-icon ad-stat-green">API</div><div><b>' +
      dashboard.apiCount + '</b><span>' + escape(AD.t('home.apiCount')) + '</span></div></div>' +
      '<div class="ad-stat-card"><div class="ad-stat-icon ad-stat-blue">DOC</div><div><b>' +
      dashboard.docsCount + '</b><span>' + escape(AD.t('home.docsCount')) + '</span></div></div>' +
      '</div>' +
      '<div class="ad-home-grid">' +
      '<div class="ad-card"><div class="ad-card-title">' + escape(AD.t('home.methodCount')) + '</div>' +
      '<div class="ad-card-body">' + methodBars(dashboard.apiMethodTotal) + '</div></div>' +
      '<div class="ad-card"><div class="ad-card-title">' + escape(AD.t('common.tag')) + '</div>' +
      '<div class="ad-card-body">' + tagCloud(dashboard.apiTagTotal) + '</div></div>' +
      '<div class="ad-card"><div class="ad-card-title">' + escape(AD.t('common.author')) + '</div>' +
      '<div class="ad-card-body">' + authorList(dashboard.apiAuthorTotal, dashboard.apiCount) + '</div></div>' +
      '<div class="ad-card ad-card-wide"><div class="ad-card-title">' + escape(AD.t('home.apiGroup')) + '</div>' +
      '<div class="ad-card-body">' +
      '<table class="ad-grid"><thead><tr>' +
      '<th>' + escape(AD.t('common.name')) + '</th>' +
      '<th style="width:140px">' + escape(AD.t('common.controller')) + '</th>' +
      '<th style="width:120px">' + escape(AD.t('common.api')) + '</th>' +
      '</tr></thead><tbody>' + renderGroupRows(groups, dashboard) + '</tbody></table>' +
      '</div></div>' +
      '</div>' +
      (state.feConfig.SHOW_VERSION !== false
        ? '<div class="ad-version">Ui Version：' + escape(state.version) + '</div>'
        : '') +
      '</div>'
    AD.i18n.applyDom(container)
  }

  AD.pages = AD.pages || {}
  AD.pages.home = { render: render }
})()