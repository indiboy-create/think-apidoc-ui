(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils
  var contextMenu = null

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function stateTabs() {
    var state = AD.appState
    if (!state.tabs.length) {
      state.tabs.push({
        path: '/home',
        query: {},
        title: AD.t('home.title'),
        affix: true,
        fullPath: '#/home',
      })
    }
    return state.tabs
  }

  function findTab(fullPath) {
    return stateTabs().find(function (tab) {
      return tab.fullPath === fullPath
    })
  }

  function tabTitle(tab) {
    if (tab.query && tab.query.title) return tab.query.title
    return tab.title || AD.t('common.pageNotFound')
  }

  function open(route) {
    var tabs = stateTabs()
    var title = route.title || (route.query && route.query.title) || AD.t('common.pageNotFound')
    var fullPath = AD.buildHash(route.path, route.query)
    var found = null
    tabs.forEach(function (tab) {
      if (tab.fullPath === fullPath) found = tab
    })
    if (found) {
      found.query = route.query
      found.fullPath = found.path === '/home' ? '#/home' : fullPath
      found.title = title
    } else {
      tabs.push({
        path: route.path,
        query: route.query || {},
        title: title,
        affix: route.path === '/home',
        fullPath: found && found.fullPath ? found.fullPath : fullPath,
      })
    }
    AD.appState.activeTab = found ? found.fullPath : fullPath
    render()
  }

  function activate(fullPath) {
    AD.appState.activeTab = fullPath
    render()
  }

  function render() {
    var container = document.getElementById('ad-tabs')
    if (!container) return
    var tabs = stateTabs()
    container.innerHTML = tabs
      .map(function (tab) {
        var active = tab.fullPath === AD.appState.activeTab
        return (
          '<div class="ad-tab' + (active ? ' active' : '') + '" data-fullpath="' + escape(tab.fullPath) + '">' +
          '<span class="ad-tab-title">' + escape(tabTitle(tab)) + '</span>' +
          (tab.affix
            ? ''
            : '<button type="button" class="ad-tab-close" data-close="' + escape(tab.fullPath) + '">' +
              '<i class="layui-icon layui-icon-close"></i></button>') +
          '</div>'
        )
      })
      .join('')
  }

  function go(fullPath) {
    if (window.location.hash === fullPath) {
      activate(fullPath)
    } else {
      window.location.hash = fullPath
    }
  }

  function close(fullPath) {
    var tabs = stateTabs()
    var index = tabs.findIndex(function (tab) {
      return tab.fullPath === fullPath
    })
    if (index < 0) return
    var wasActive = tabs[index].fullPath === AD.appState.activeTab
    tabs.splice(index, 1)
    if (!tabs.length) {
      tabs.push({
        path: '/home',
        query: {},
        title: AD.t('home.title'),
        affix: true,
        fullPath: '#/home',
      })
    }
    if (wasActive) {
      var last = tabs[tabs.length - 1]
      AD.appState.activeTab = last.fullPath
      go(last.fullPath)
    }
    render()
  }

  function closeLeftOrRight(fullPath, direction) {
    var tabs = stateTabs()
    var index = tabs.findIndex(function (tab) {
      return tab.fullPath === fullPath
    })
    if (index < 0) return
    var removedActive = false
    var origin = tabs.slice()
    var next = origin.filter(function (tab, tabIndex) {
      var remove =
        !tab.affix &&
        ((direction === 'left' && tabIndex < index) ||
          (direction === 'right' && tabIndex > index))
      if (remove && tab.fullPath === AD.appState.activeTab) removedActive = true
      return !remove
    })
    tabs.length = 0
    next.forEach(function (tab) {
      tabs.push(tab)
    })
    if (removedActive) {
      var last = tabs[tabs.length - 1]
      AD.appState.activeTab = last.fullPath
      go(last.fullPath)
    }
    render()
  }

  function closeAll() {
    var tabs = stateTabs().filter(function (tab) {
      return tab.affix
    })
    stateTabs().splice(0)
    tabs.forEach(function (tab) {
      stateTabs().push(tab)
    })
    var last = stateTabs()[stateTabs().length - 1]
    AD.appState.activeTab = last.fullPath
    go(last.fullPath)
    render()
  }

  function hideContextMenu() {
    if (contextMenu && contextMenu.parentNode) contextMenu.parentNode.removeChild(contextMenu)
    contextMenu = null
  }

  function showContextMenu(event, fullPath) {
    hideContextMenu()
    var items = [
      { action: 'closeCurrent', title: AD.t('layout.tabs.closeCurrent') },
      { action: 'closeLeft', title: AD.t('layout.tabs.closeLeft') },
      { action: 'closeRight', title: AD.t('layout.tabs.closeRight') },
      { action: 'closeAll', title: AD.t('layout.tabs.closeAll') },
    ]
    contextMenu = document.createElement('div')
    contextMenu.className = 'ad-context-menu'
    contextMenu.style.left = event.clientX + 'px'
    contextMenu.style.top = event.clientY + 'px'
    contextMenu.innerHTML = items
      .map(function (item) {
        return '<a data-action="' + item.action + '">' + escape(item.title) + '</a>'
      })
      .join('')
    document.body.appendChild(contextMenu)
    contextMenu.addEventListener('click', function (e) {
      var action = e.target.getAttribute('data-action')
      if (!action) return
      if (action === 'closeCurrent') close(fullPath)
      else if (action === 'closeLeft') closeLeftOrRight(fullPath, 'left')
      else if (action === 'closeRight') closeLeftOrRight(fullPath, 'right')
      else if (action === 'closeAll') closeAll()
      hideContextMenu()
    })
    setTimeout(function () {
      document.addEventListener('click', hideContextMenu, { once: true })
    }, 0)
  }

  function bind() {
    var container = document.getElementById('ad-tabs')
    if (!container || container.getAttribute('data-bound') === '1') return
    container.setAttribute('data-bound', '1')
    container.addEventListener('click', function (event) {
      var closeBtn = event.target.closest('.ad-tab-close')
      if (closeBtn) {
        event.stopPropagation()
        close(closeBtn.getAttribute('data-close'))
        return
      }
      var tab = event.target.closest('.ad-tab')
      if (!tab) return
      go(tab.getAttribute('data-fullpath'))
    })
    container.addEventListener('contextmenu', function (event) {
      var tab = event.target.closest('.ad-tab')
      if (!tab) return
      var fullPath = tab.getAttribute('data-fullpath')
      var found = findTab(fullPath)
      if (found && found.affix) return
      event.preventDefault()
      showContextMenu(event, fullPath)
    })
  }

  AD.tabs = {
    open: open,
    render: render,
    activate: activate,
    close: close,
    closeAll: closeAll,
    bind: bind,
    findTab: findTab,
  }
})()