(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  var markedInstance = window.marked
  if (markedInstance && markedInstance.setOptions) {
    markedInstance.setOptions({ gfm: true, breaks: true })
  }

  var headingIndex = 0

  function highlight(container) {
    if (!window.hljs) return
    container.querySelectorAll('pre code').forEach(function (block) {
      try {
        window.hljs.highlightElement(block)
      } catch (e) {
        // ignore
      }
    })
  }

  function applyHeadingIds(container) {
    headingIndex = 0
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(function (heading) {
      headingIndex++
      var id = heading.getAttribute('id')
      if (!id) {
        id = 'md-heading-' + headingIndex
        heading.setAttribute('id', id)
      }
      heading.classList.add('ad-md-heading')
    })
  }

  function render(md) {
    var container = document.createElement('div')
    container.className = 'ad-markdown'
    if (!md) return container
    var html = ''
    try {
      html = markedInstance ? markedInstance.parse(String(md)) : utils.escapeHtml(md)
    } catch (e) {
      html = utils.escapeHtml(md)
    }
    container.innerHTML = html
    applyHeadingIds(container)
    highlight(container)
    return container
  }

  function renderInto(element, md) {
    element.innerHTML = ''
    var content = render(md)
    while (content.firstChild) element.appendChild(content.firstChild)
  }

  function getNavTree(container) {
    var headings = []
    container.querySelectorAll('h2, h3').forEach(function (heading) {
      headings.push({
        title: heading.textContent.replace(/\s+/g, ' ').trim(),
        level: heading.tagName === 'H2' ? 2 : 3,
        id: heading.getAttribute('id'),
      })
    })
    var tree = []
    var lastH2 = null
    headings.forEach(function (item) {
      if (item.level === 2) {
        lastH2 = { title: item.title, id: item.id, children: [] }
        tree.push(lastH2)
      } else if (lastH2) {
        lastH2.children.push(item)
      }
    })
    return tree
  }

  function showMdModal(title, md) {
    var content = render(md)
    layui.layer.open({
      type: 1,
      title: utils.escapeHtml(title),
      area: ['720px', '70%'],
      shadeClose: true,
      content: '<div class="ad-md-modal ad-markdown"></div>',
      success: function (layerEl) {
        var target = layerEl.find('.ad-md-modal')
        var content = render(md)
        while (content.firstChild) target[0].appendChild(content.firstChild)
      },
    })
  }

  AD.markdown = {
    render: render,
    renderInto: renderInto,
    getNavTree: getNavTree,
    showMdModal: showMdModal,
    highlight: highlight,
  }
})()