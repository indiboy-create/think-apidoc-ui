(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils
  var tableSeq = 0
  var registered = []

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function renderType(d) {
    var type = d.type || ''
    if (type === 'array' && d.childrenType) {
      return escape(type) + '&lt;' + escape(d.childrenType) + '&gt;'
    }
    return escape(type)
  }

  function renderRequire(d) {
    if (d.require === true || d.require === 1 || d.require === '1') {
      return '<i class="layui-icon layui-icon-ok ad-require-ok"></i>'
    }
    return ''
  }

  function renderDefault(d) {
    var value = d.default
    if (value === undefined || value === null) return ''
    if (typeof value === 'object') value = JSON.stringify(value)
    return '<span class="ad-cell-mono">' + escape(value) + '</span>'
  }

  function renderDesc(d) {
    var CUSTOM = AD.appState.feConfig.CUSTOM_METHODS || {}
    var desc = d.desc || ''
    if (typeof CUSTOM.HANDEL_APIFIELD_DESC === 'function') {
      desc = CUSTOM.HANDEL_APIFIELD_DESC(desc)
    }
    var html = d.html ? d.html : utils.textToHtml(desc)
    var md = d.md || d.mdRef || ''
    var link = md
      ? ' <a class="ad-md-link" data-md="' + escape(md) + '" data-name="' + escape(d.name) + '">' +
        escape(AD.t('common.view')) + '</a>'
      : ''
    return '<span class="ad-cell-desc">' + html + '</span>' + link
  }

  function buildParamCols() {
    return [
      {
        field: 'name',
        title: AD.t('apiPage.common.field'),
        width: 280,
        templet: function (d) {
          return '<span class="ad-cell-name">' + escape(d.name) + '</span>'
        },
      },
      {
        field: 'type',
        title: AD.t('apiPage.common.method'),
        width: 130,
        align: 'center',
        templet: function (d) {
          return renderType(d)
        },
      },
      {
        field: 'require',
        title: AD.t('apiPage.common.require'),
        width: 90,
        align: 'center',
        templet: function (d) {
          return renderRequire(d)
        },
      },
      {
        field: 'default',
        title: AD.t('apiPage.common.defaultValue'),
        width: 110,
        align: 'center',
        templet: function (d) {
          return renderDefault(d)
        },
      },
      {
        field: 'desc',
        title: AD.t('apiPage.common.desc'),
        minWidth: 200,
        templet: function (d) {
          return renderDesc(d)
        },
      },
    ]
  }

  function buildStatusCols() {
    return [
      {
        field: 'name',
        title: AD.t('apiPage.responsesStatus.name'),
        width: 120,
        templet: function (d) {
          return escape(d.name)
        },
      },
      {
        field: 'contentType',
        title: AD.t('apiPage.responsesStatus.contentType'),
        width: 200,
        templet: function (d) {
          return escape(d.contentType || '')
        },
      },
      {
        field: 'desc',
        title: AD.t('apiPage.common.desc'),
        minWidth: 200,
        templet: function (d) {
          return utils.textToHtml(d.desc || '')
        },
      },
    ]
  }

  function withId(node, index) {
    var copy = Object.assign({}, node)
    copy.id = copy.id || copy.menuKey || 'row_' + index + '_' + utils.createRandKey()
    if (copy.children && copy.children.length) {
      copy.children = copy.children.map(withId)
    }
    return copy
  }

  function renderParams(container, params, options) {
    if (!(params && params.length)) return null
    var opts = options || {}
    var id = 'ad-param-table-' + ++tableSeq
    var tableProps = AD.appState.feConfig.API_TABLE_PROPS || {}
    var expandAll =
      opts.expandAll !== undefined
        ? opts.expandAll
        : tableProps.defaultExpandAllRows !== false
    var data = params.map(withId)
    var wrap = document.createElement('div')
    wrap.className = 'ad-table-wrap'
    if (opts.title) {
      var title = document.createElement('div')
      title.className = 'ad-section-title'
      title.innerHTML = '<span>' + escape(opts.title) + '</span>'
      wrap.appendChild(title)
    }
    var tableBox = document.createElement('div')
    tableBox.id = id
    wrap.appendChild(tableBox)
    container.appendChild(wrap)

    layui.use(['treeTable'], function () {
      try {
        layui.treeTable.render({
          elem: '#' + id,
          data: data,
          page: false,
          limit: 2000,
          tree: {
            customName: {
              children: 'children',
              name: 'name',
            },
            view: {
              expandAllDefault: expandAll,
              indent: 20,
            },
          },
          cols: [opts.cols || buildParamCols()],
        })
        registered.push(id)
      } catch (error) {
        if (window.console) console.error(error)
      }
    })
    return id
  }

  function renderStatus(container, list) {
    if (!(list && list.length)) return
    var id = 'ad-status-table-' + ++tableSeq
    var wrap = document.createElement('div')
    wrap.className = 'ad-table-wrap'
    var tableBox = document.createElement('div')
    tableBox.id = id
    wrap.appendChild(tableBox)
    container.appendChild(wrap)
    layui.use(['table'], function () {
      layui.table.render({
        elem: '#' + id,
        data: list,
        page: false,
        limit: 2000,
        cols: [buildStatusCols()],
      })
      registered.push(id)
    })
  }

  function renderResponses(container, detail) {
    var success = detail.responseSuccess || []
    var error = detail.responseError || []
    var status = detail.responseStatus || []
    if (!success.length && !error.length && !status.length) return

    var wrap = document.createElement('div')
    wrap.className = 'ad-responses'
    var tabs = []
    if (success.length || detail.responseSuccessMd) {
      tabs.push({ key: 'success', title: AD.t('apiPage.responses.success') })
    }
    if (error.length || detail.responseErrorMd) {
      tabs.push({ key: 'error', title: AD.t('apiPage.responses.error') })
    }
    if (status.length) {
      tabs.push({ key: 'status', title: AD.t('apiPage.responsesStatus') })
    }

    var header = document.createElement('div')
    header.className = 'ad-subtabs'
    header.innerHTML =
      '<span class="ad-section-title">' + escape(AD.t('apiPage.responses')) + '</span>' +
      '<div class="ad-subtab-list">' +
      tabs
        .map(function (item, index) {
          return '<a class="ad-subtab' + (index === 0 ? ' active' : '') + '" data-key="' + item.key + '">' +
            escape(item.title) + '</a>'
        })
        .join('') +
      '</div>'
    wrap.appendChild(header)

    var panel = document.createElement('div')
    panel.className = 'ad-response-panels'
    wrap.appendChild(panel)
    container.appendChild(wrap)

    function renderPanel(key) {
      panel.innerHTML = ''
      if (key === 'success') {
        if (detail.responseSuccessMd) {
          var md = detail.responseSuccessMd
          var CUSTOM = AD.appState.feConfig.CUSTOM_METHODS || {}
          if (typeof CUSTOM.HANDEL_API_MD === 'function') md = CUSTOM.HANDEL_API_MD(md)
          panel.appendChild(AD.markdown.render(md))
        } else {
          renderParams(panel, success)
        }
      } else if (key === 'error') {
        if (detail.responseErrorMd) {
          var errorMd = detail.responseErrorMd
          var custom = AD.appState.feConfig.CUSTOM_METHODS || {}
          if (typeof custom.HANDEL_API_MD === 'function') errorMd = custom.HANDEL_API_MD(errorMd)
          panel.appendChild(AD.markdown.render(errorMd))
        } else {
          var errorCols = buildParamCols()
          errorCols[2].title = AD.t('common.notEmpty')
          renderParams(panel, error, { cols: errorCols })
        }
      } else if (key === 'status') {
        renderStatus(panel, status)
      }
    }
    renderPanel(tabs[0].key)

    header.querySelectorAll('.ad-subtab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        header.querySelectorAll('.ad-subtab').forEach(function (item) {
          item.classList.remove('active')
        })
        tab.classList.add('active')
        renderPanel(tab.getAttribute('data-key'))
        setTimeout(refresh, 30)
      })
    })
  }

  function refresh() {
    registered.forEach(function (id) {
      try {
        if (layui.treeTable && layui.treeTable.resize) layui.treeTable.resize(id)
      } catch (e) {
        // ignore
      }
      try {
        if (layui.table && layui.table.resize) layui.table.resize(id)
      } catch (e) {
        // ignore
      }
    })
  }

  function bindMdLinks(container) {
    container.addEventListener('click', function (event) {
      var link = event.target.closest('.ad-md-link')
      if (!link) return
      var md = link.getAttribute('data-md') || ''
      var name = link.getAttribute('data-name') || ''
      AD.markdown.showMdModal(AD.t('apiPage.mdDetail.title', { name: name }), md)
    })
  }

  AD.apiTable = {
    renderParams: renderParams,
    renderResponses: renderResponses,
    renderStatus: renderStatus,
    bindMdLinks: bindMdLinks,
    refresh: refresh,
    buildParamCols: buildParamCols,
  }
})()