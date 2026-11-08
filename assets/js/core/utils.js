(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})

  var utils = {}

  utils.escapeHtml = function (text) {
    return String(text === undefined || text === null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  utils.textToHtml = function (text) {
    return text ? utils.escapeHtml(text).replace(/ /g, '&nbsp;').replace(/\r?\n/g, '<br>') : ''
  }

  utils.escapeRegExp = function (text) {
    return String(text).replace(/[-\\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  utils.deepClone = function (value) {
    if (value === undefined) return undefined
    try {
      return JSON.parse(JSON.stringify(value))
    } catch (e) {
      return value
    }
  }

  utils.isArray = function (value) {
    return Object.prototype.toString.call(value) === '[object Array]'
  }

  utils.isObject = function (value) {
    return value !== null && typeof value === 'object' && !utils.isArray(value)
  }

  utils.createRandKey = function () {
    return String(Date.now()) + Math.ceil(Math.random() * 1000)
  }

  utils.getRandomNumber = function (max, min) {
    return Math.floor(Math.random() * max + (min || 0))
  }

  utils.createIdcardEndNumber = function (idcard) {
    var arrExp = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    var arrValid = [1, 0, 'X', 9, 8, 7, 6, 5, 4, 3, 2]
    var sum = 0
    for (var i = 0; i < 17; i++) {
      sum += parseInt(idcard[i], 10) * arrExp[i]
    }
    return arrValid[sum % 11]
  }

  utils.createIdcard = function () {
    var cityPrefixs = [
      11, 12, 13, 14, 15, 21, 22, 23, 31, 32, 33, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46, 50, 51,
      52, 53, 54, 61, 62, 63, 64, 65, 71, 81, 82,
    ]
    var idcard = String(cityPrefixs[utils.getRandomNumber(cityPrefixs.length)])
    for (var i = 2; i < 18; i++) {
      if (i < 6) {
        idcard += utils.getRandomNumber(10)
      } else if (i === 6) {
        idcard += utils.getRandomNumber(2, 1)
      } else if (i === 7) {
        idcard += idcard[6] === '1' ? 9 : 0
      } else if (i === 8) {
        idcard += idcard[6] === '1' ? utils.getRandomNumber(7, 3) : utils.getRandomNumber(2)
      } else if (i === 9) {
        idcard += utils.getRandomNumber(10)
      } else if (i === 10) {
        idcard += utils.getRandomNumber(2)
      } else if (i === 11) {
        idcard += idcard[10] === '0' ? utils.getRandomNumber(9, 1) : utils.getRandomNumber(3)
      } else if (i === 12) {
        var maxDays = new Date(
          Number(idcard.substr(6, 4)),
          Number(idcard.substr(10, 2)),
          0,
        ).getDate()
        var day = utils.getRandomNumber(maxDays, 1)
        idcard += day < 10 ? '0' + day : day
        i++
      } else if (i > 13 && i < 17) {
        idcard += utils.getRandomNumber(10)
      } else if (i === 17) {
        idcard += utils.createIdcardEndNumber(idcard)
      }
    }
    return idcard
  }

  utils.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(String(text))
    }
    var element = document.createElement('textarea')
    element.value = String(text)
    element.setAttribute('readonly', '')
    element.style.position = 'absolute'
    element.style.left = '-9999px'
    document.body.appendChild(element)
    element.select()
    var success = false
    try {
      success = document.execCommand('copy')
    } catch (e) {
      success = false
    }
    document.body.removeChild(element)
    return success ? Promise.resolve() : Promise.reject(new Error('copy failed'))
  }

  utils.debounce = function (fn, wait) {
    var timer = null
    return function () {
      var args = arguments
      var context = this
      clearTimeout(timer)
      timer = setTimeout(function () {
        fn.apply(context, args)
      }, wait || 200)
    }
  }

  utils.throttle = function (fn, wait) {
    var last = 0
    return function () {
      var now = Date.now()
      if (now - last >= wait) {
        last = now
        return fn.apply(this, arguments)
      }
    }
  }

  utils.getObjectValueByKey = function (key, target) {
    var value = target
    if (key && String(key).indexOf('.') > -1) {
      String(key)
        .split('.')
        .forEach(function (item) {
          if (item && typeof value === 'object' && value !== null) {
            value = value[item]
          }
        })
    } else if (key) {
      value = value[key]
    }
    return value
  }

  utils.setObjectValueByKey = function (target, key, value) {
    var result = target
    if (key && String(key).indexOf('.') > -1) {
      var keys = String(key).split('.')
      var find = result
      keys.forEach(function (item, index) {
        if (index >= keys.length - 1) {
          find[item] = value
        } else if (find[item]) {
          find = find[item]
        }
      })
    } else if (key) {
      result[key] = value
    }
    return result
  }

  utils.formatTime = function (date) {
    var d = date || new Date()
    function pad(value) {
      return value < 10 ? '0' + value : String(value)
    }
    return (
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ':' +
      pad(d.getSeconds()) +
      '.' +
      String(d.getMilliseconds()).padStart(3, '0')
    )
  }

  utils.firstToUpperCase = function (text) {
    return String(text).slice(0, 1).toUpperCase() + String(text).slice(1).toLowerCase()
  }

  utils.upperFirstLetter = function (text) {
    return String(text).charAt(0).toUpperCase() + String(text).slice(1)
  }

  utils.camelToUnderline = function (text) {
    return String(text)
      .replace(/[A-Z]/g, function (s) {
        return ' ' + s.toLowerCase()
      })
      .trim()
      .replace(/ /g, '_')
  }

  utils.toCamelCase = function (text) {
    return String(text || '').replace(/([-_])([a-z])/g, function (m, p1, p2) {
      return p2.toUpperCase()
    })
  }

  utils.checkStringRules = function (value, rules) {
    var message = ''
    if (rules && rules.length) {
      for (var i = 0; i < rules.length; i++) {
        var rule = rules[i]
        if (rule.required && !(value || value === '0')) {
          message = rule.message
          break
        }
        if (rule.pattern) {
          var reg = new RegExp(rule.pattern)
          if (!reg.test(value)) {
            message = rule.message
            break
          }
        }
      }
    }
    return message
  }

  utils.replaceAppConfigKeys = function (app, text) {
    if (!(app && app.nodes)) return text
    var result = String(text)
    for (var i = 0; i < 3; i++) {
      var item = app.nodes[i]
      if (item) {
        Object.keys(item).forEach(function (key) {
          var keyStr = '${app[' + i + '].' + key + '}'
          if (result.indexOf(keyStr) > -1) {
            result = result.replace(new RegExp(utils.escapeRegExp(keyStr), 'g'), item[key])
          }
        })
      }
    }
    return result
  }

  utils.replaceStringByParam = function (text, params) {
    var result = String(text)
    Object.keys(params || {}).forEach(function (key) {
      var keyStr = '${form.' + key + '}'
      var value = params[key]
      if (value === undefined || value === null) value = ''
      if (result.indexOf(keyStr) > -1) {
        result = result.replace(new RegExp(utils.escapeRegExp(keyStr), 'g'), value)
      }
    })
    return result
  }

  utils.filterTree = function (tree, predicate) {
    return (tree || [])
      .map(function (node) {
        var copy = Object.assign({}, node)
        if (copy.children && copy.children.length) {
          copy.children = utils.filterTree(copy.children, predicate)
        }
        return copy
      })
      .filter(function (node) {
        return predicate(node) || (node.children && node.children.length)
      })
  }

  utils.treeToList = function (tree) {
    var result = []
    function walk(list) {
      ;(list || []).forEach(function (node) {
        result.push(node)
        if (node.children && node.children.length) walk(node.children)
      })
    }
    walk(tree)
    return result
  }

  utils.getTreePath = function (tree, predicate, key, path) {
    var keys = path || []
    var treeKey = key || 'menuKey'
    if (!tree) return []
    for (var i = 0; i < tree.length; i++) {
      var item = tree[i]
      keys.push(item[treeKey])
      if (predicate(item)) return keys
      if (item.children && item.children.length) {
        var found = utils.getTreePath(item.children, predicate, treeKey, keys)
        if (found.length) return found
      }
      keys.pop()
    }
    return []
  }

  utils.findNode = function (tree, predicate) {
    var list = (tree || []).slice()
    while (list.length) {
      var node = list.shift()
      if (predicate(node)) return node
      if (node.children && node.children.length) list = list.concat(node.children)
    }
    return null
  }

  utils.getTreeKeys = function (tree) {
    var keys = []
    utils.treeToList(tree).forEach(function (node) {
      keys.push(node.menuKey)
    })
    return keys
  }

  utils.methodColor = function (method) {
    var colors = AD.appState.feConfig.METHOD_COLOR || {}
    return colors[method] || ''
  }

  utils.methodList = function (method) {
    if (!method) return []
    if (typeof method === 'string') {
      return method.indexOf(',') > -1 ? method.split(',') : [method]
    }
    return utils.isArray(method) ? method : []
  }

  utils.downloadJson = function (data, filename) {
    var text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    var url = window.URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = url
    link.download = filename || 'download.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  utils.loadScript = function (src) {
    if (!src) return
    var script = document.createElement('script')
    script.src = src
    script.async = true
    document.body.appendChild(script)
  }

  utils.loadStyle = function (href) {
    if (!href) return
    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }

  utils.parseJson = function (text) {
    var value = String(text).trim()
    if (!value) return {}
    try {
      return JSON.parse(value)
    } catch (e) {
      try {
        return new Function('return (' + value + ')')()
      } catch (err) {
        throw new Error('json format error')
      }
    }
  }

  AD.utils = utils
})()