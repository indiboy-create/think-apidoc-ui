(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils
  var state = AD.appState
  var bound = false


  function escape(value) {
    return utils.escapeHtml(value)
  }

  function menuList() {
    return state.sideTab === 'api' ? state.apiMenus : state.docsMenus
  }

  function nodeTags(node) {
    if (!node.tag) return []
    return utils.isArray(node.tag) ? node.tag : String(node.tag).split(',')
  }

  function matchesKeyword(node, keyword) {
    if (!keyword) return true
    var text = [node.title, node.url, node.controller, node.name].join(' ').toLowerCase()
    return text.indexOf(keyword) > -1
  }

  function matchesTags(node, tags) {
    if (!tags.length) return true
    var list = nodeTags(node)
    return tags.some(function (tag) {
      return list.indexOf(tag) > -1
    })
  }

  function filterMenus(tree) {
    var keyword = (state.menuKeyword || '').trim().toLowerCase()
    var tags = state.menuTags || []
    if (!keyword && !tags.length) return tree
    return utils.filterTree(tree, function (node) {
      return matchesKeyword(node, keyword) && matchesTags(node, tags)
    })
  }

  function nodeType(node) {
    if (node.controller) return 'controller'
    if (node.url) return 'api'
    if (node.path) return 'md'
    return 'folder'
  }

  function nodeIcon(node) {
    var type = nodeType(node)
    if (type === 'controller') {
      return '<i class="layui-icon layui-icon-app ad-node-icon ad-node-controller"></i>'
    }
    if (type === 'md') {
      return '<i class="layui-icon layui-icon-file-b ad-node-icon ad-node-md"></i>'
    }
    if (type === 'folder') {
      return '<i class="layui-icon layui-icon-folder ad-node-icon ad-node-folder"></i>'
    }
    return ''
  }

  function methodHtml(node) {
    if (nodeType(node) !== 'api') return ''
    var methods = utils.methodList(node.method)
    if (!methods.length) {
      return '<span class="ad-method ad-method-default">API</span>'
    }
    if (methods.length > 1) {
      var color = utils.methodColor(methods[0])
      return (
        '<span class="ad-method ad-method-multiple" style="border-color:' + color + ';color:' + color + '">' +
        methods.length + '</span>'
      )
    }
    var method = methods[0]
    var methodColor = utils.methodColor(method)
    return (
      '<span class="ad-method" style="color:' + methodColor + '">' +
      escape(method) + '</span>'
    )
  }

  function nodeTitle(node) {
    if (node.title === '未分组') return AD.t('common.notGroup')
    if (!node.title && node.controller) return node.controller
    return node.title || node.name || ''
  }

  function collectOpenKeys() {
    var keys = {}
    if (!state.currentKey) return keys
    var fullTree = menuList()
    var path = utils.getTreePath(fullTree, function (node) {
      return node.menuKey === state.currentKey
    })
    path.forEach(function (key) {
      keys[key] = true
    })
    return keys
  }

  function renderNode(node, level, openKeys) {
    var children = node.children || []
    var hasChildren = children.length > 0
    var keyword = (state.menuKeyword || '').trim()
    var type = nodeType(node)
    var isOpen =
      state.menuOpenAll ||
      level === 0 ||
      (keyword && hasChildren) ||
      openKeys[node.menuKey] === true
    var active = node.menuKey && node.menuKey === state.currentKey
    var urlText = ''
    if (state.feConfig.MENU.SHOWURL) {
      if (node.controller) {
        urlText = '<span class="ad-node-url">' + escape(node.controller) + '</span>'
      } else if (node.url) {
        urlText = '<span class="ad-node-url">' + escape(node.url) + '</span>'
      }
    }
    var caret = hasChildren
      ? '<i class="layui-icon layui-icon-right ad-tree-caret"></i>'
      : '<i class="ad-tree-caret ad-tree-caret-placeholder"></i>'
    var html =
      '<li class="ad-tree-node' + (hasChildren ? '' : ' leaf') + (hasChildren && !isOpen ? ' closed' : '') +
      '" data-key="' + escape(node.menuKey || '') + '">' +
      '<div class="ad-tree-title' + (active ? ' active' : '') + '" data-type="' + type + '">' +
      caret + methodHtml(node) + nodeIcon(node) +
      '<span class="ad-tree-text" title="' + escape(nodeTitle(node)) + '">' + escape(nodeTitle(node)) + '</span>' +
      urlText +
      '</div>'
    if (hasChildren) {
      html +=
        '<ul class="ad-tree-children">' +
        children
          .map(function (child) {
            return renderNode(child, level + 1, openKeys)
          })
          .join('') +
        '</ul>'
    }
    html += '</li>'
    return html
  }

  function renderMenu() {
    var container = document.getElementById('ad-menu')
    if (!container) return
    var list = filterMenus(menuList())
    if (!list.length) {
      container.innerHTML =
        '<div class="ad-empty">' + escape(AD.t('common.notdata')) + '</div>'
      return
    }
    var openKeys = collectOpenKeys()
    var html =
      '<ul class="ad-tree">' +
      list
        .map(function (node) {
          return renderNode(node, 0, openKeys)
        })
        .join('') +
      '</ul>'
    container.innerHTML = html
  }

  function bindMenuEvents() {
    var container = document.getElementById('ad-menu')
    if (!container || container.getAttribute('data-bound') === '1') return
    container.setAttribute('data-bound', '1')
    container.addEventListener('click', function (event) {
      var caret = event.target.closest('.ad-tree-caret')
      var title = event.target.closest('.ad-tree-title')
      if (!title) return
      var li = title.parentNode
      var hasChildren = li.querySelector('.ad-tree-children')
      if (caret && hasChildren) {
        li.classList.toggle('closed')
        return
      }
      var type = title.getAttribute('data-type')
      if (type === 'controller' || type === 'folder') {
        if (hasChildren) li.classList.toggle('closed')
        return
      }
      var key = li.getAttribute('data-key')
      if (!key) return
      var node = utils.findNode(menuList(), function (n) {
        return n.menuKey === key
      })
      if (!node) return
      if (type === 'md') {
        AD.app.openMd(node)
      } else if (node.url) {
        AD.app.openApi(node)
      }
    })
  }

  function updateMenuButtons() {
    var toggleBtn = document.getElementById('ad-toggle-menu')
    if (toggleBtn) {
      var icon = toggleBtn.querySelector('i')
      if (icon) {
        icon.className = 'layui-icon ' + (state.menuOpenAll ? 'layui-icon-up' : 'layui-icon-down')
      }
      toggleBtn.setAttribute('title', state.menuOpenAll ? AD.t('side.collapse') : AD.t('side.expand'))
    }
    var tagsBtn = document.getElementById('ad-tags-btn')
    if (tagsBtn) {
      tagsBtn.classList.toggle('active', state.menuTags.length > 0)
    }
  }

  function renderTagsPanel() {
    var panel = document.getElementById('ad-tags-panel')
    if (!panel) return
    var tags = state.apiMenuMeta.tags || []
    if (!tags.length) {
      panel.innerHTML = '<div class="ad-empty ad-empty-sm">' + escape(AD.t('common.notdata')) + '</div>'
      return
    }
    panel.innerHTML =
      '<div class="ad-tags-head">' + escape(AD.t('side.tags')) + '</div>' +
      '<div class="ad-tags-list">' +
      tags
        .map(function (tag) {
          var checked = state.menuTags.indexOf(tag) > -1
          return (
            '<label class="ad-tag-item"><input type="checkbox" value="' + escape(tag) + '"' +
            (checked ? ' checked' : '') + '> <span>' + escape(tag) + '</span></label>'
          )
        })
        .join('') +
      '</div>' +
      '<div class="ad-tags-actions">' +
      '<button type="button" class="ad-btn ad-btn-sm" data-action="clear">' + escape(AD.t('common.clear')) + '</button>' +
      '<button type="button" class="ad-btn ad-btn-sm ad-btn-primary" data-action="close">' + escape(AD.t('common.ok')) + '</button>' +
      '</div>'
    if (!panel.getAttribute('data-bound')) {
      panel.setAttribute('data-bound', '1')
      panel.addEventListener('change', function (event) {
        if (event.target.type !== 'checkbox') return
        var value = event.target.value
        var index = state.menuTags.indexOf(value)
        if (event.target.checked && index < 0) state.menuTags.push(value)
        if (!event.target.checked && index > -1) state.menuTags.splice(index, 1)
        renderMenu()
        updateMenuButtons()
      })
      panel.addEventListener('click', function (event) {
        var action = event.target.getAttribute('data-action')
        if (action === 'clear') {
          state.menuTags = []
          panel.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
            input.checked = false
          })
          renderMenu()
          updateMenuButtons()
        } else if (action === 'close') {
          panel.classList.remove('open')
        }
      })
    }
  }

  function bindTagsPanel() {
    var btn = document.getElementById('ad-tags-btn')
    var panel = document.getElementById('ad-tags-panel')
    if (!btn || !panel) return
    btn.addEventListener('click', function (event) {
      event.stopPropagation()
      renderTagsPanel()
      panel.classList.toggle('open')
    })
    document.addEventListener('click', function (event) {
      if (!panel.contains(event.target) && event.target !== btn && !btn.contains(event.target)) {
        panel.classList.remove('open')
      }
    })
  }

  function renderAppSelect() {
    var container = document.getElementById('ad-app-select')
    if (!container) return
    var current = state.appObject[state.appKey]
    var label = current ? current.fullTitle : state.appList.length ? AD.t('common.pleaseSelect') : AD.t('common.notdata')
    var lock = current && current.hasPassword

    var existingBtn = container.querySelector('.ad-app-btn')
    if (existingBtn) {
      existingBtn.querySelector('.ad-app-name').textContent = label
      var existingLock = existingBtn.querySelector('.ad-app-lock')
      if (existingLock) existingLock.style.display = lock ? '' : 'none'
      return
    }

    container.innerHTML =
      '<button type="button" class="ad-app-btn">' +
      '<span class="ad-app-name">' + escape(label) + '</span>' +
      '<i class="layui-icon layui-icon-password ad-app-lock"' + (lock ? '' : ' style="display:none"') + '></i>' +
      '<i class="layui-icon layui-icon-down"></i></button>'

    var data = state.appList.map(function (app) {
      return {
        title: app.fullTitle,
        id: app.appKey,
      }
    })
    layui.use(['dropdown'], function () {
      layui.dropdown.render({
        elem: container.querySelector('.ad-app-btn'),
        data: data.length ? data : [{ title: AD.t('common.notdata'), id: '' }],
        click: function (item) {
          if (!item.id || item.id === state.appKey) return
          AD.app.changeApp(item.id)
        },
        className: 'ad-app-dropdown',
      })
    })
  }

  function renderSideTabs() {
    var tabs = document.querySelectorAll('.ad-side-tab')
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === state.sideTab)
    })
  }

  function render() {
    renderSideTabs()
    renderAppSelect()
    renderMenu()
    updateMenuButtons()
  }

  function bind() {
    if (bound) return
    bound = true
    bindMenuEvents()
    bindTagsPanel()

    document.querySelectorAll('.ad-side-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var next = tab.getAttribute('data-tab')
        if (next === state.sideTab) return
        state.sideTab = next
        state.currentKey = ''
        renderSideTabs()
        if (next === 'docs' && !state.docsMenus.length) {
          AD.app.loadDocsMenus()
        }
        renderMenu()
      })
    })

    var search = document.getElementById('ad-search-input')
    if (search) {
      search.addEventListener(
        'input',
        utils.debounce(function () {
          state.menuKeyword = search.value
          renderMenu()
        }, 200),
      )
    }

    var reload = document.getElementById('ad-reload-menu')
    if (reload) {
      reload.addEventListener('click', function () {
        AD.app.reloadMenus()
      })
    }

    var toggle = document.getElementById('ad-toggle-menu')
    if (toggle) {
      toggle.addEventListener('click', function () {
        state.menuOpenAll = !state.menuOpenAll
        renderMenu()
        updateMenuButtons()
      })
    }

    initDrag()
  }

  function initDrag() {
    var dragline = document.getElementById('ad-dragline')
    if (!dragline) return
    dragline.addEventListener('mousedown', function (event) {
      if (state.device === 'mobile') return
      event.preventDefault()
      var startX = event.clientX
      var startWidth = state.sideWidth
      document.body.classList.add('ad-dragging')
      function onMove(e) {
        var width = Math.min(640, Math.max(240, startWidth + e.clientX - startX))
        state.sideWidth = width
        document.documentElement.style.setProperty('--ad-side-width', width + 'px')
      }
      function onUp() {
        document.body.classList.remove('ad-dragging')
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        AD.storage.set('SIDE_WIDTH', state.sideWidth)
        AD.apiTable.refresh()
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  AD.sidebar = {
    render: render,
    renderMenu: renderMenu,
    renderAppSelect: renderAppSelect,
    bind: bind,
    renderTagsPanel: renderTagsPanel,
  }
})()