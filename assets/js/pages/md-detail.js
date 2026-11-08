(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function escape(value) {
    return utils.escapeHtml(value)
  }

  function renderNav(tree) {
    if (!tree.length) return ''
    function renderItems(items, level) {
      return items
        .map(function (item) {
          var children = item.children && item.children.length
            ? '<ul class="ad-md-nav-children">' + renderItems(item.children, level + 1) + '</ul>'
            : ''
          return (
            '<li class="ad-md-nav-level-' + level + '">' +
            '<a data-target="' + escape(item.id) + '">' + escape(item.title) + '</a>' +
            children +
            '</li>'
          )
        })
        .join('')
    }
    return (
      '<div class="ad-md-nav-title">' + escape(AD.t('md.anchor')) + '</div>' +
      '<ul class="ad-md-nav">' + renderItems(tree, 2) + '</ul>'
    )
  }

  function showLoading(container) {
    container.innerHTML =
      '<div class="ad-skeleton">' +
      '<div class="ad-skeleton-line w40"></div>' +
      '<div class="ad-skeleton-line w60"></div>' +
      '<div class="ad-skeleton-line w90"></div>' +
      '<div class="ad-skeleton-block"></div>' +
      '</div>'
  }

  function render(container, route) {
    var state = AD.appState
    showLoading(container)
    AD.api
      .getDocDetail({
        appKey: route.query.appKey || state.appKey,
        path: route.query.key,
        lang: route.query.lang || state.lang,
        shareKey: route.query.shareKey || state.shareKey,
      })
      .then(function (data) {
        container.innerHTML = ''
        var layout = document.createElement('div')
        layout.className = 'ad-md-layout'
        var content = document.createElement('div')
        content.className = 'ad-md-content'
        var markdown = AD.markdown.render(data.content || '')
        content.appendChild(markdown)
        layout.appendChild(content)

        var navData = AD.markdown.getNavTree(content)
        var nav = document.createElement('aside')
        nav.className = 'ad-md-anchor'
        nav.innerHTML = renderNav(navData)
        layout.appendChild(nav)
        container.appendChild(layout)

        nav.addEventListener('click', function (event) {
          var link = event.target.closest('[data-target]')
          if (!link) return
          event.preventDefault()
          var target = document.getElementById(link.getAttribute('data-target'))
          if (target) {
            window.scrollTo({
              top: target.getBoundingClientRect().top + window.pageYOffset - 90,
              behavior: 'smooth',
            })
          }
        })
      })
      .catch(function (error) {
        container.innerHTML =
          '<div class="ad-error-card">' +
          '<h3>' + escape(AD.t('md.loadError')) + '</h3>' +
          '<p>' + escape((error.data && error.data.message) || error.message || '') + '</p>' +
          '</div>'
        AD.auth.handleError(error)
      })
  }

  AD.pages = AD.pages || {}
  AD.pages.mdDetail = { render: render }
})()