(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function optionList(props) {
    var options = (props && props.options) || []
    if (!Array.isArray(options)) return []
    return options.map(function (item) {
      if (item && typeof item === 'object') {
        return { label: item.label || item.title || item.value, value: item.value }
      }
      return { label: item, value: item }
    })
  }

  function formControl(item, value) {
    var type = item.type || 'input'
    var field = item.field
    var current = value === undefined ? item.default : value
    if (current === undefined) current = ''
    var attrs = ' data-field="' + escape(field) + '"'
    if (type === 'select') {
      return '<select class="layui-select"' + attrs + '>' +
        optionList(item.props)
          .map(function (option) {
            return '<option value="' + escape(option.value) + '"' +
              (String(option.value) === String(current) ? ' selected' : '') + '>' +
              escape(option.label) + '</option>'
          })
          .join('') + '</select>'
    }
    if (type === 'number') {
      return '<input type="number" class="layui-input"' + attrs + ' value="' + escape(current) + '">'
    }
    if (type === 'checkbox') {
      return '<input type="checkbox"' + attrs + (current ? ' checked' : '') + '>'
    }
    if (type === 'radioGroup') {
      return '<div class="ad-radio-group">' +
        optionList(item.props)
          .map(function (option) {
            return '<label class="ad-radio"><input type="radio" name="' + escape(field) + '"' +
              attrs + ' value="' + escape(option.value) + '"' +
              (String(option.value) === String(current) ? ' checked' : '') + '> ' +
              escape(option.label) + '</label>'
          })
          .join('') + '</div>'
    }
    return '<input type="text" class="layui-input"' + attrs + ' value="' + escape(current) + '">'
  }

  function readForm(root) {
    var data = {}
    root.querySelectorAll('[data-field]').forEach(function (el) {
      var field = el.getAttribute('data-field')
      if (el.type === 'checkbox') data[field] = el.checked
      else if (el.type === 'radio') {
        if (el.checked) data[field] = el.value
      } else data[field] = el.value
    })
    return data
  }

  function toTree(nodes, selectMode) {
    var result = []
    ;(nodes || []).forEach(function (node) {
      if (selectMode === 'controller' && node.url) return
      var id = node.menuKey || node.path || node.controller || node.name || utils.createRandKey()
      var item = {
        title: node.title || node.controller || node.name || '',
        nodeKey: id,
        spread: true,
      }
      if (node.children && node.children.length) {
        item.children = toTree(node.children, selectMode)
      }
      result.push(item)
    })
    return result
  }

  function filterTreeByKeyword(tree, keyword) {
    if (!keyword) return tree
    var text = keyword.toLowerCase()
    function walk(list) {
      return (list || [])
        .map(function (node) {
          var copy = Object.assign({}, node)
          var match =
            String(node.title || '').toLowerCase().indexOf(text) > -1 ||
            String(node.menuKey || '').toLowerCase().indexOf(text) > -1 ||
            String(node.url || '').toLowerCase().indexOf(text) > -1
          if (node.children && node.children.length) {
            copy.children = walk(node.children)
          }
          if (match || (copy.children && copy.children.length)) return copy
          return null
        })
        .filter(Boolean)
    }
    return walk(tree)
  }

  function open() {
    var state = AD.appState
    var templates = state.serverConfig.code_template || []
    if (!templates.length) return

    var currentIndex = 0
    var currentTemplate = templates[0]
    var apiTreeRaw = state.apiMenus || []
    var selected = []
    var appKey = state.appKey
    var keyword = ''
    var reloadHandler = null

    var html =
      '<div class="ad-code-template">' +
      '<div class="ad-ct-menu"></div>' +
      '<div class="ad-ct-side">' +
      '<div class="ad-ct-tree-head">' +
      '<select class="layui-select ad-ct-app"></select>' +
      '<input type="text" class="layui-input ad-ct-search" placeholder="' +
      escape(AD.t('common.search')) + '">' +
      '</div>' +
      '<div class="ad-ct-tree-box"></div>' +
      '</div>' +
      '<div class="ad-ct-content">' +
      '<div class="ad-ct-selected"></div>' +
      '<div class="ad-ct-form"></div>' +
      '<div class="ad-ct-tips"></div>' +
      '<div class="ad-ct-code"></div>' +
      '</div>' +
      '</div>'

    layui.use(['layer', 'tree'], function () {
      var layer = layui.layer
      var tree = layui.tree

      layer.open({
        type: 1,
        title: AD.t('codeTemplate.title'),
        area: ['92%', '88%'],
        shadeClose: false,
        content: html,
        btn: [AD.t('codeTemplate.reload'), AD.t('common.close')],
        success: function (layerEl) {
          var root = layerEl.find('.ad-code-template')[0]
          var menuBox = root.querySelector('.ad-ct-menu')
          var treeBox = root.querySelector('.ad-ct-tree-box')
          var appSelect = root.querySelector('.ad-ct-app')
          var searchInput = root.querySelector('.ad-ct-search')
          var selectedBox = root.querySelector('.ad-ct-selected')
          var formBox = root.querySelector('.ad-ct-form')
          var tipsBox = root.querySelector('.ad-ct-tips')
          var codeBox = root.querySelector('.ad-ct-code')

          appSelect.innerHTML = state.appList
            .map(function (app) {
              return '<option value="' + escape(app.appKey) + '"' +
                (app.appKey === appKey ? ' selected' : '') + '>' +
                escape(app.fullTitle) + '</option>'
            })
            .join('')

          function renderMenu() {
            menuBox.innerHTML = templates
              .map(function (item, index) {
                return '<a class="ad-ct-menu-item' + (index === currentIndex ? ' active' : '') +
                  '" data-index="' + index + '">' + escape(item.title) + '</a>'
              })
              .join('')
          }

          function renderForm(formData) {
            var items = (currentTemplate.form && currentTemplate.form.items) || []
            if (!items.length) {
              formBox.innerHTML = ''
              return
            }
            formBox.innerHTML = items
              .map(function (item) {
                return (
                  '<div class="ad-form-item"><label>' + escape(item.title) + '</label>' +
                  formControl(item, formData[item.field]) + '</div>'
                )
              })
              .join('')
          }

          function renderSelected() {
            var label =
              currentTemplate.select_mode === 'controller'
                ? AD.t('common.controller')
                : AD.t('common.api')
            selectedBox.innerHTML =
              '<div class="ad-ct-selected-label">' + escape(label) + '：</div>' +
              '<div class="ad-ct-selected-tags">' +
              (selected.length
                ? selected
                    .map(function (node) {
                      return '<span class="ad-tag">' + escape(node.title || node.name) +
                        '<i class="layui-icon layui-icon-close" data-remove="' +
                        escape(node.menuKey || node.path) + '"></i></span>'
                    })
                    .join('')
                : '<span class="ad-placeholder">' + escape(AD.t('common.pleaseSelect')) + '</span>') +
              '</div>'
            tipsBox.innerHTML = currentTemplate.tips
              ? '<div class="ad-alert ad-alert-warning">' + escape(currentTemplate.tips) + '</div>'
              : ''
          }

          function renderEmptyCode() {
            codeBox.innerHTML =
              '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.pleaseSelect')) + '</div>'
          }

          function findRawNode(id) {
            return utils.findNode(apiTreeRaw, function (node) {
              return (
                node.menuKey === id ||
                node.path === id ||
                node.controller === id ||
                node.name === id
              )
            })
          }

          function renderTree() {
            var treeData = filterTreeByKeyword(apiTreeRaw, keyword)
            var nodes = toTree(treeData, currentTemplate.select_mode)
            treeBox.innerHTML = ''
            var treeId = 'ad-ct-tree'
            var box = document.createElement('div')
            box.id = treeId
            treeBox.appendChild(box)
            tree.render({
              elem: '#' + treeId,
              data: nodes,
              id: treeId,
              onlyIconControl: false,
              click: function (obj) {
                var node = findRawNode(obj.data.nodeKey)
                if (!node) return
                if (currentTemplate.select_mode === 'controller' && !node.controller) return
                if (currentTemplate.select_mode === 'api' && !node.url) return
                addSelected(node)
              },
            })
          }

          function addSelected(node) {
            var key = node.menuKey || node.path
            if (currentTemplate.multiple) {
              var exists = selected.some(function (item) {
                return (item.menuKey || item.path) === key
              })
              if (!exists) {
                if (currentTemplate.limit && selected.length >= currentTemplate.limit) {
                  layer.msg(AD.t('common.pleaseSelect'), { icon: 0 })
                  return
                }
                selected.push(node)
              }
            } else {
              selected = [node]
            }
            renderSelected()
            if (!currentTemplate.multiple || !currentTemplate.limit) {
              reloadCode()
            } else if (selected.length === currentTemplate.limit) {
              reloadCode()
            }
          }

          function renderCode(code) {
            codeBox.innerHTML = ''
            var head = document.createElement('div')
            head.className = 'ad-code-head'
            head.innerHTML =
              '<span>' + escape(currentTemplate.title) + '</span>' +
              '<button type="button" class="ad-btn ad-btn-sm" data-copy>' +
              escape(AD.t('common.copy')) + '</button>'
            var pre = document.createElement('pre')
            pre.className = 'ad-pre ad-ct-pre'
            var codeEl = document.createElement('code')
            codeEl.className = 'language-' + escape(currentTemplate.language || 'text')
            codeEl.textContent = code || ''
            pre.appendChild(codeEl)
            codeBox.appendChild(head)
            codeBox.appendChild(pre)
            if (window.hljs) {
              try {
                window.hljs.highlightElement(codeEl)
              } catch (e) {
                // ignore
              }
            }
            head.querySelector('[data-copy]').addEventListener('click', function () {
              utils.copyText(code || '').then(function () {
                layer.msg(AD.t('common.copySuccess'), { icon: 1 })
              })
            })
          }

          function reloadCode() {
            if (!selected.length) {
              renderEmptyCode()
              return
            }
            var values = readForm(root)
            var selectedKeys = selected.map(function (node) {
              return currentTemplate.select_mode === 'controller'
                ? node.path || node.menuKey
                : node.menuKey
            })
            layer.load(2, { shade: 0.05 })
            AD.api
              .renderCodeTemplate({
                appKey: appKey,
                template: currentTemplate,
                selected: selectedKeys,
                form: values,
              })
              .then(function (data) {
                layer.closeAll('loading')
                renderCode(data.code || '')
              })
              .catch(function (error) {
                layer.closeAll('loading')
                codeBox.innerHTML =
                  '<div class="ad-error-card ad-error-inline"><p>' +
                  escape((error.data && error.data.message) || error.message) + '</p></div>'
              })
          }

          function switchTemplate(index) {
            currentIndex = index
            currentTemplate = templates[index]
            selected = []
            renderMenu()
            renderForm((currentTemplate.form && currentTemplate.form.data) || {})
            renderSelected()
            renderEmptyCode()
            renderTree()
          }

          function loadApiTree(nextAppKey) {
            appKey = nextAppKey
            layer.load(2, { shade: 0.05 })
            AD.api
              .getApiMenus({ appKey: appKey })
              .then(function (data) {
                layer.closeAll('loading')
                apiTreeRaw = data.data || []
                selected = []
                renderSelected()
                renderTree()
              })
              .catch(function (error) {
                layer.closeAll('loading')
                layer.msg((error.data && error.data.message) || error.message, { icon: 2 })
              })
          }

          menuBox.addEventListener('click', function (event) {
            var item = event.target.closest('.ad-ct-menu-item')
            if (!item) return
            switchTemplate(Number(item.getAttribute('data-index')))
          })

          selectedBox.addEventListener('click', function (event) {
            var remove = event.target.closest('[data-remove]')
            if (!remove) return
            var key = remove.getAttribute('data-remove')
            selected = selected.filter(function (node) {
              return (node.menuKey || node.path) !== key
            })
            renderSelected()
            if (selected.length) reloadCode()
            else renderEmptyCode()
          })

          searchInput.addEventListener(
            'input',
            utils.debounce(function () {
              keyword = searchInput.value
              renderTree()
            }, 200),
          )

          appSelect.addEventListener('change', function () {
            loadApiTree(appSelect.value)
          })

          reloadHandler = reloadCode

          renderMenu()
          renderForm((currentTemplate.form && currentTemplate.form.data) || {})
          renderSelected()
          renderEmptyCode()
          renderTree()
        },
        yes: function () {
          if (reloadHandler) reloadHandler()
        },
      })
    })
  }

  AD.pages = AD.pages || {}
  AD.pages.codeTemplate = { open: open }
})()