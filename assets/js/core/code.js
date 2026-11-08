(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function trimValue(value) {
    return value === undefined || value === null ? '' : String(value).trim()
  }

  function renderCodeJsonByParams(params, isMock, globalParams, appKey) {
    var json = {}
    if (!(params && params.length)) return json
    params.forEach(function (item) {
      var fieldValue = item.default
      if (isMock && item.mock) {
        fieldValue = AD.mock(item.mock)
      }
      if (fieldValue === undefined) {
        if (item.type === 'int') fieldValue = null
        if (item.type === 'boolean') fieldValue = false
      }
      if (item.type === 'array' && (fieldValue === 'array' || !fieldValue)) {
        fieldValue = []
      }
      var value = ['int', 'float', 'boolean', 'array', 'object'].indexOf(item.type) > -1
        ? fieldValue
        : trimValue(fieldValue)

      if (item.type === 'object' && item.children && item.children.length) {
        value = renderCodeJsonByParams(item.children, isMock)
      } else if (item.type === 'array' && item.children && item.children.length) {
        var childrenData = renderCodeJsonByParams(item.children, isMock)
        var arr = Object.keys(childrenData).map(function (key) {
          return childrenData[key]
        })
        if (item.childrenType === 'array') {
          value = [arr]
        } else if (item.childrenType === 'string' || item.childrenType === 'int') {
          value = arr.length ? arr : null
        } else {
          value = [childrenData]
        }
      } else if (item.type === 'tree' && item.children && item.children.length) {
        value = [renderCodeJsonByParams(item.children, isMock)]
      }

      if (globalParams && globalParams.body) {
        var allGlobal = globalParams.body.find(function (p) {
          return p.name === item.name && p.appKey === 'all'
        })
        var appGlobal = globalParams.body.find(function (p) {
          return p.name === item.name && p.appKey === appKey
        })
        var found = appGlobal || allGlobal
        if (found && found.value) value = found.value
      }
      json[item.name] = value
    })
    return json
  }

  function formatJson(value) {
    return JSON.stringify(value, null, '\t')
  }

  function getPrefix(name, isExport) {
    return (isExport ? 'export ' : '') + 'interface ' + name + '{\n'
  }

  function pad(num) {
    var text = ''
    for (var i = 0; i < num; i++) text += ' '
    return text
  }

  function transformTsByParams(params, config) {
    var result = ''
    var subs = ''
    var padContent = pad(config.outputIndent)

    ;(params || []).forEach(function (item) {
      var require = item.require ? '' : '?'
      if (item.type === 'int' || (item.type && item.type.indexOf('int(') > -1)) {
        result += padContent + item.name + require + ': number;\n'
      } else if (item.type === 'boolean') {
        result += padContent + item.name + require + ': boolean;\n'
      } else if (item.type === 'array' || config.childrenType === 'array') {
        if (item.children && item.children.length) {
          var propName = utils.upperFirstLetter(utils.toCamelCase(item.name)) + 'Item'
          result += padContent + item.name + require + ': ' + propName + '[];\n'
          subs += transformTypeScript(item.children, {
            outputIndent: config.outputIndent,
            rootName: propName,
            exportRoot: config.exportRoot,
            childrenType: item.childrenType,
          })
        } else {
          var anyKey = item.childrenType || 'any'
          result += padContent + item.name + require + ': ' + anyKey + '[];\n'
        }
      } else if (item.type === 'object') {
        if (item.children && item.children.length) {
          var objName = utils.upperFirstLetter(utils.toCamelCase(item.name))
          result += padContent + item.name + require + ': ' + objName + ';\n'
          subs += transformTypeScript(item.children, {
            outputIndent: config.outputIndent,
            rootName: objName,
            exportRoot: config.exportRoot,
            childrenType: item.childrenType,
          })
        } else {
          result += padContent + item.name + require + ': any;\n'
        }
      } else {
        result += padContent + item.name + require + ': string;\n'
      }
    })
    return [result, subs]
  }

  function transformTypeScript(params, config) {
    var merged = Object.assign(
      { outputIndent: 2, rootName: 'RootName', exportRoot: true },
      config || {},
    )
    var result = transformTsByParams(params, merged)
    return (
      result[1] +
      getPrefix(merged.rootName, merged.exportRoot) +
      result[0] +
      '}\n\n'
    )
  }

  AD.code = {
    renderCodeJsonByParams: renderCodeJsonByParams,
    formatJson: formatJson,
    transformTypeScript: transformTypeScript,
  }
})()