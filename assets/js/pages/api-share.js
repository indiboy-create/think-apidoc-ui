(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function toAppTree(apps, selected, parentKey) {
    return (apps || []).map(function (app) {
      var appKey = parentKey ? parentKey + ',' + app.key : app.key
      var node = {
        title: app.title,
        nodeKey: appKey,
        checked: (selected || []).indexOf(appKey) > -1,
        spread: true,
      }
      if (app.items && app.items.length) {
        node.children = toAppTree(app.items, selected, appKey)
      }
      return node
    })
  }

  function toApiTree(nodes, selected) {
    return (nodes || []).map(function (node) {
      var id = node.menuKey || node.appKey || node.title
      var item = {
        title: node.title || node.controller || node.name || '',
        nodeKey: id,
        checked: (selected || []).indexOf(id) > -1,
        spread: true,
      }
      if (node.children && node.children.length) {
        item.children = toApiTree(node.children, selected)
      }
      return item
    })
  }

  function openEdit(key, onReload) {
    layui.use(['layer', 'tree'], function () {
      var layer = layui.layer
      var tree = layui.tree
      var state = AD.appState
      var appTreeId = 'ad-share-app-tree-' + utils.createRandKey()
      var apiTreeId = 'ad-share-api-tree-' + utils.createRandKey()
      var currentType = 'all'
      var formData = { type: 'all' }
      var loadingAllApi = false
      var apiRawTreeCache = []
      var layerIndex = null

      var html =
        '<div class="ad-share-edit">' +
        '<div class="ad-share-edit-form">' +
        '<div class="ad-form-row">' +
        '<label>' + escape(AD.t('common.name')) + '<span class="ad-required">*</span></label>' +
        '<input type="text" class="layui-input" data-share-field="name" value="">' +
        '</div>' +
        '<div class="ad-form-row">' +
        '<label>' + escape(AD.t('auth.password.label')) + '</label>' +
        '<input type="password" class="layui-input" data-share-field="password" value="">' +
        '</div>' +
        '<div class="ad-form-row">' +
        '<label>' + escape(AD.t('apiShare.type.label')) + '</label>' +
        '<div class="ad-radio-group">' +
        ['all', 'app', 'api'].map(function (type) {
          return '<label class="ad-radio"><input type="radio" name="ad-share-type" value="' + type + '"' +
            (type === 'all' ? ' checked' : '') + '> ' + escape(AD.t('apiShare.type.' + type)) + '</label>'
        }).join('') +
        '</div></div></div>' +
        '<div class="ad-share-tree-box" data-share-tree="app"></div>' +
        '<div class="ad-share-tree-box" data-share-tree="api"></div>' +
        '<div class="ad-share-all-text" hidden>' + escape(AD.t('apiShare.all.text')) + '</div>' +
        '</div>'

      function updateType(type) {
        currentType = type
        var appBox = document.querySelector('.ad-share-edit [data-share-tree="app"]')
        var apiBox = document.querySelector('.ad-share-edit [data-share-tree="api"]')
        var allText = document.querySelector('.ad-share-edit .ad-share-all-text')
        if (!appBox) return
        appBox.hidden = type !== 'app'
        apiBox.hidden = type !== 'api'
        allText.hidden = type !== 'all'
        if (type === 'app') renderAppTree()
        if (type === 'api') renderApiTree()
      }

      function renderAppTree() {
        var box = document.querySelector('.ad-share-edit [data-share-tree="app"]')
        if (!box) return
        box.innerHTML = '<div id="' + appTreeId + '"></div>'
        tree.render({
          elem: '#' + appTreeId,
          data: toAppTree(state.serverConfig.apps || [], formData.appKeys || []),
          id: appTreeId,
          showCheckbox: true,
          onlyIconControl: false,
        })
      }

      function renderApiTree() {
        var box = document.querySelector('.ad-share-edit [data-share-tree="api"]')
        if (!box) return
        box.innerHTML = '<div id="' + apiTreeId + '"></div>'
        if (loadingAllApi) return
        loadingAllApi = true
        layer.load(2, { shade: 0.05 })
        AD.api
          .getAllApiMenus()
          .then(function (data) {
            layer.closeAll('loading')
            loadingAllApi = false
            apiRawTreeCache = data || []
            tree.render({
              elem: '#' + apiTreeId,
              data: toApiTree(apiRawTreeCache, formData.apiKeys || []),
              id: apiTreeId,
              showCheckbox: true,
              onlyIconControl: false,
            })
          })
          .catch(function (error) {
            layer.closeAll('loading')
            loadingAllApi = false
            layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
          })
      }

      function collectAppKeys() {
        var checked = tree.getChecked(appTreeId) || []
        var keys = []
        function walk(list) {
          ;(list || []).forEach(function (node) {
            if (node.nodeKey) keys.push(node.nodeKey)
            if (node.children && node.children.length) walk(node.children)
          })
        }
        walk(checked)
        return keys
      }


      layerIndex = layer.open({
        type: 1,
        title: key ? AD.t('apiShare.edit') : AD.t('apiShare.add'),
        area: ['900px', '82%'],
        shadeClose: false,
        content: html,
        btn: [AD.t('common.ok'), AD.t('common.close')],
        success: function (layerEl) {
          var root = layerEl.find('.ad-share-edit')[0]
          var nameInput = root.querySelector('[data-share-field="name"]')
          var passwordInput = root.querySelector('[data-share-field="password"]')

          root.querySelectorAll('[data-share-type]').forEach(function (radio) {
            radio.addEventListener('change', function () {
              updateType(radio.value)
            })
          })
          root.querySelectorAll('input[name="ad-share-type"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
              updateType(radio.value)
            })
          })

          function fillForm(data) {
            formData = data || { type: 'all' }
            formData.type = formData.type || 'all'
            nameInput.value = formData.name || ''
            passwordInput.value = formData.password || ''
            root.querySelectorAll('input[name="ad-share-type"]').forEach(function (radio) {
              radio.checked = radio.value === formData.type
            })
            updateType(formData.type)
          }

          if (key) {
            layer.load(2, { shade: 0.05 })
            AD.api
              .getApiShareDetail({ key: key })
              .then(function (data) {
                layer.closeAll('loading')
                fillForm(data)
              })
              .catch(function (error) {
                layer.closeAll('loading')
                layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
              })
          } else {
            fillForm({ type: 'all' })
          }

          layerEl.data('ad-share-root', root)
        },
        yes: function (index) {
          var root = document.querySelector('.ad-share-edit')
          var name = root.querySelector('[data-share-field="name"]').value.trim()
          var password = root.querySelector('[data-share-field="password"]').value
          var type = (root.querySelector('input[name="ad-share-type"]:checked') || {}).value || 'all'
          if (!name) {
            layer.msg(AD.t('common.pleaseInput') + AD.t('common.name'), { icon: 2 })
            return
          }
          var payload = {
            name: name,
            password: password,
            type: type,
          }
          if (key) payload.key = key
          if (type === 'app') {
            var appKeys = collectAppKeys()
            if (!appKeys.length) {
              layer.msg(AD.t('common.pleaseSelect') + AD.t('apiShare.type.app'), { icon: 2 })
              return
            }
            payload.appKeys = appKeys
          } else if (type === 'api') {

            var checked = tree.getChecked(apiTreeId) || []
            if (!checked.length) {
              layer.msg(AD.t('common.pleaseSelect') + AD.t('apiShare.type.api'), { icon: 2 })
              return
            }
            var ids = []
            function walkChecked(list) {
              ;(list || []).forEach(function (node) {
                if (node.nodeKey) ids.push(node.nodeKey)
                if (node.children && node.children.length) walkChecked(node.children)
              })
            }
            walkChecked(checked)
            var appKeysResult = []
            ;(function collectFromTree(list) {
              ;(list || []).forEach(function (node) {
                var nodeId = node.menuKey || node.appKey || node.title
                if (ids.indexOf(nodeId) > -1 && node.appKey && appKeysResult.indexOf(node.appKey) < 0) {
                  appKeysResult.push(node.appKey)
                }
                if (node.children && node.children.length) collectFromTree(node.children)
              })
            })(apiRawTreeCache || [])
            payload.apiKeys = ids
            payload.appKeys = appKeysResult
          }
          layer.load(2, { shade: 0.05 })
          AD.api
            .addApiShare(payload)
            .then(function () {
              layer.closeAll('loading')
              layer.msg(AD.t('common.actionSuccess'), { icon: 1 })
              layer.close(index)
              if (typeof onReload === 'function') onReload()
            })
            .catch(function (error) {
              layer.closeAll('loading')
              layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
            })
        },
      })

      var apiRawTreeCache = []
    })
  }

  function open() {
    var state = AD.appState
    var pageIndex = 1
    var pageSize = 5
    var total = 0
    var shareList = []
    var reloadHandler = null

    var html =
      '<div class="ad-share-list">' +
      '<div class="ad-share-list-head">' +
      '<button type="button" class="layui-btn layui-btn-sm" data-action="create">' +
      '<i class="layui-icon layui-icon-add-1"></i> ' + escape(AD.t('apiShare.button.create')) +
      '</button></div>' +
      '<div class="ad-share-items"></div>' +
      '<div class="ad-share-pagination"></div>' +
      '</div>'

    layui.use(['layer', 'laypage'], function () {
      var layer = layui.layer
      var laypage = layui.laypage

      var layerIndex = layer.open({
        type: 1,
        title: AD.t('apiShare.title'),
        area: ['900px', '75%'],
        shadeClose: false,
        content: html,
        btn: [AD.t('common.close')],
        success: function (layerEl) {
          var root = layerEl.find('.ad-share-list')[0]
          var itemsBox = root.querySelector('.ad-share-items')
          var paginationBox = root.querySelector('.ad-share-pagination')

          function renderList() {
            if (!shareList.length) {
              itemsBox.innerHTML =
                '<div class="ad-empty">' + escape(AD.t('common.notdata')) + '</div>'
              paginationBox.innerHTML = ''
              return
            }
            itemsBox.innerHTML = shareList
              .map(function (item) {
                var actions = ''

                var customActions = (state.serverConfig.share && state.serverConfig.share.actions) || []
                customActions.forEach(function (action, actionIndex) {
                  actions += '<a data-action="custom" data-index="' + actionIndex + '" data-key="' +
                    escape(item.key) + '">' + escape(action.name) + '</a>'
                })
                return (
                  '<div class="ad-share-item" data-key="' + escape(item.key) + '">' +
                  '<div class="ad-share-item-main">' +
                  '<h4>' + escape(item.name) + '</h4>' +
                  '<div class="ad-share-item-desc">' +
                  '<span>' + escape(AD.t('apiShare.type.label')) + '：' +
                  escape(AD.t('apiShare.type.' + item.type)) + '</span>' +
                  '<span>' + escape(AD.t('apiShare.time.label')) + '：' +
                  escape(item.create_at || item.create_time || '') + '</span></div></div>' +
                  '<div class="ad-share-item-actions">' +
                  '<div class="ad-share-item-buttons">' +
                  '<button type="button" class="ad-btn ad-btn-sm" data-action="edit" data-key="' +
                  escape(item.key) + '">' + escape(AD.t('apiShare.button.edit')) + '</button>' +
                  '<button type="button" class="ad-btn ad-btn-sm ad-btn-danger" data-action="delete" data-key="' +
                  escape(item.key) + '">' + escape(AD.t('apiShare.button.delete')) + '</button>' +
                  '</div>' +
                  '<div class="ad-share-item-links">' +
                  '<a data-action="copy" data-key="' + escape(item.key) + '">' +
                  escape(AD.t('common.copyUrl')) + '</a>' +
                  (state.serverConfig.export_config && state.serverConfig.export_config.enable
                    ? '<a data-action="export" data-key="' + escape(item.key) + '" data-name="' +
                      escape(item.name) + '">' + escape(AD.t('common.exportSwaggerJson')) + '</a>'
                    : '') +
                  actions +
                  '</div></div></div>'
                )
              })
              .join('')
            paginationBox.innerHTML =
              '<div class="ad-pagination">' +
              '<button type="button" class="ad-btn ad-btn-sm" data-page="prev">上一页</button>' +
              '<span>' + pageIndex + ' / ' + Math.max(1, Math.ceil(total / pageSize)) + '</span>' +
              '<button type="button" class="ad-btn ad-btn-sm" data-page="next">下一页</button>' +
              '</div>'
          }

          function fetchList() {
            layer.load(2, { shade: 0.05 })
            AD.api
              .getApiShareList({ pageIndex: pageIndex })
              .then(function (data) {
                layer.closeAll('loading')
                shareList = data.data || []
                total = data.total || 0
                renderList()
              })
              .catch(function (error) {
                layer.closeAll('loading')
                layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
              })
          }

          function copyLink(key) {
            var url = window.location.href.split('#')[0]
            utils.copyText(url + '#/home?shareKey=' + key).then(function () {
              layer.msg(AD.t('common.copySuccess'), { icon: 1 })
            })
          }

          function exportSwagger(key, name) {
            layer.load(2, { shade: 0.05 })
            AD.api
              .exportSwagger({ key: key })
              .then(function (data) {
                layer.closeAll('loading')
                utils.downloadJson(data, 'swagger-' + name + '.json')
              })
              .catch(function (error) {
                layer.closeAll('loading')
                layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
              })
          }

          root.addEventListener('click', function (event) {
            var actionEl = event.target.closest('[data-action]')
            if (!actionEl) {
              var pageEl = event.target.closest('[data-page]')
              if (pageEl) {
                var direction = pageEl.getAttribute('data-page')
                var maxPage = Math.max(1, Math.ceil(total / pageSize))
                if (direction === 'prev' && pageIndex > 1) pageIndex--
                if (direction === 'next' && pageIndex < maxPage) pageIndex++
                fetchList()
              }
              return
            }
            var action = actionEl.getAttribute('data-action')
            var key = actionEl.getAttribute('data-key')
            if (action === 'create') {
              openEdit(null, function () {
                pageIndex = 1
                fetchList()
              })
            } else if (action === 'edit') {
              openEdit(key, fetchList)
            } else if (action === 'delete') {
              layer.confirm(AD.t('common.deleteConfirm'), {
                title: AD.t('common.tip'),
                btn: [AD.t('common.ok'), AD.t('common.cancel')],
              }, function (confirmIndex) {
                layer.close(confirmIndex)
                AD.api
                  .deleteApiShare({ key: key })
                  .then(function () {
                    layer.msg(AD.t('common.actionSuccess'), { icon: 1 })
                    fetchList()
                  })
                  .catch(function (error) {
                    layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
                  })
              })
            } else if (action === 'copy') {
              copyLink(key)
            } else if (action === 'export') {
              exportSwagger(key, actionEl.getAttribute('data-name') || 'share')
            } else if (action === 'custom') {
              var actionIndex = actionEl.getAttribute('data-index')
              AD.api
                .handleApiShareAction({ key: key, index: Number(actionIndex) })
                .then(function (data) {
                  try {
                    if (data && typeof data === 'string') eval(data)
                  } catch (e) {
                    layer.msg(e.message, { icon: 2 })
                  }
                })
                .catch(function (error) {
                  layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
                })
            }
          })

          fetchList()
        },
      })
    })
  }

  AD.pages = AD.pages || {}
  AD.pages.apiShare = { open: open }
})()