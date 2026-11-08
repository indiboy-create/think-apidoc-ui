(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function encodeValue(value) {
    if (AD.appState.feConfig.HTTP.ENCODEURICOMPONENT !== false) {
      return encodeURIComponent(value)
    }
    return value
  }

  var events = {
    setHeader: function (param) {
      var event = param.event
      var config = param.config
      if (event.key && param.value !== undefined) {
        config.headers[event.key] = encodeValue(param.value)
        return Promise.resolve({ event: event, config: config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    setQuery: function (param) {
      var event = param.event
      var config = param.config
      if (event.key && param.value !== undefined) {
        config.params[event.key] = param.value
        return Promise.resolve({ event: event, config: config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    setBody: function (param) {
      var event = param.event
      var config = param.config
      if (event.key && param.value !== undefined) {
        if (config.data instanceof FormData) {
          config.data.set(event.key, param.value)
        } else {
          config.data[event.key] = param.value
        }
        return Promise.resolve({ event: event, config: config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearHeader: function (param) {
      var event = param.event
      if (event.key) {
        delete param.config.headers[event.key]
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearQuery: function (param) {
      var event = param.event
      if (event.key) {
        delete param.config.params[event.key]
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearBody: function (param) {
      var event = param.event
      if (event.key) {
        if (param.config.data instanceof FormData) {
          param.config.data.delete(event.key)
        } else {
          delete param.config.data[event.key]
        }
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    setGlobalHeader: function (param) {
      var event = param.event
      if (event.key && param.value !== undefined) {
        AD.globalParams.setParam('header', event.key, param.value, event.desc, event.appKey)
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    setGlobalQuery: function (param) {
      var event = param.event
      if (event.key && param.value !== undefined) {
        AD.globalParams.setParam('query', event.key, param.value, event.desc, event.appKey)
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    setGlobalBody: function (param) {
      var event = param.event
      if (event.key && param.value !== undefined) {
        AD.globalParams.setParam('body', event.key, param.value, event.desc, event.appKey)
        return Promise.resolve({ event: event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearGlobalHeader: function (param) {
      if (param.event.key) {
        AD.globalParams.removeParam('header', param.event.key)
        return Promise.resolve({ event: param.event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearGlobalQuery: function (param) {
      if (param.event.key) {
        AD.globalParams.removeParam('query', param.event.key)
        return Promise.resolve({ event: param.event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    clearGlobalBody: function (param) {
      if (param.event.key) {
        AD.globalParams.removeParam('body', param.event.key)
        return Promise.resolve({ event: param.event, config: param.config, value: param.value })
      }
      return Promise.reject(new Error('key required'))
    },
    ajax: function (param) {
      var event = param.event
      var config = param.config
      if (!event.url) return Promise.reject(new Error('url required'))
      var method = (event.method || config.method || 'GET').toUpperCase()
      var ajaxConfig = {
        method: method,
        url: event.url,
        headers: {},
        params: {},
        data: {},
        baseURL: event.appKey && AD.appState.appObject[event.appKey]
          ? AD.appState.appObject[event.appKey].host
          : undefined,
      }
      if (event.contentType) ajaxConfig.headers['content-type'] = event.contentType
      var queryData = {}
      var bodyData = {}
      if (event.value) {
        if (String(event.value).indexOf('query.') > -1) {
          queryData = utils.getObjectValueByKey(event.value, { query: config.params })
        } else if (String(event.value).indexOf('body.') > -1) {
          bodyData = utils.getObjectValueByKey(event.value, { body: config.data })
        } else if (method === 'GET') {
          queryData = event.value
        } else {
          bodyData = event.value
        }
        if (event.key) {
          if (queryData && Object.keys(queryData).length) ajaxConfig.params[event.key] = queryData
          if (bodyData && Object.keys(bodyData).length) ajaxConfig.data[event.key] = bodyData
        } else {
          ajaxConfig.params = queryData
          ajaxConfig.data = bodyData
        }
      }
      ;(event.before || []).forEach(function (item) {
        var itemValue = item.value
        if (item.value && String(item.value).indexOf('query.') > -1) {
          itemValue = utils.getObjectValueByKey(item.value, { query: config.params })
        } else if (item.value && String(item.value).indexOf('body.') > -1) {
          itemValue = utils.getObjectValueByKey(item.value, { body: config.data })
        }
        if (item.event === 'setQuery') {
          if (item.key) ajaxConfig.params[item.key] = itemValue
          else ajaxConfig.params = itemValue
        } else if (item.event === 'setBody') {
          if (item.key) ajaxConfig.data[item.key] = itemValue
          else ajaxConfig.data = itemValue
        } else if (item.event === 'setHeader') {
          if (item.key) ajaxConfig.headers[item.key] = encodeValue(itemValue)
          else if (utils.isObject(itemValue)) ajaxConfig.headers = itemValue
        }
      })
      return AD.http.raw(ajaxConfig).then(function (response) {
        ;(event.after || []).forEach(function (item) {
          var itemValue = item.value
          if (item.value && String(item.value).indexOf('res.') > -1) {
            itemValue = utils.getObjectValueByKey(item.value, { res: response })
          }
          if (item.key && item.event === 'setQuery') config.params[item.key] = itemValue
          else if (item.key && item.event === 'setBody') config.data[item.key] = itemValue
          else if (item.key && item.event === 'setHeader') config.headers[item.key] = encodeValue(itemValue)
        })
        return { event: event, result: response, config: config }
      })
    },
  }

  function getEvents() {
    var custom = AD.appState.feConfig.DEBUG_EVENTS || {}
    var merged = {}
    Object.keys(events).forEach(function (key) {
      merged[key] = events[key]
    })
    Object.keys(custom).forEach(function (key) {
      merged[key] = custom[key]
    })
    return merged
  }

  function handleRequestEvent(eventList, config, response) {
    return new Promise(function (resolve) {
      var result = { status: 'default', list: [], config: config }
      if (!(eventList && eventList.length)) {
        resolve(result)
        return
      }
      var currentEvents = getEvents()
      var tasks = []
      ;(eventList || []).forEach(function (item) {
        var value = item.value
        if (item.value && String(item.value).indexOf('params.') > -1) {
          value = utils.getObjectValueByKey(item.value, {
            params: utils.deepClone(config.params),
          })
        } else if (item.value && String(item.value).indexOf('body.') > -1) {
          value = utils.getObjectValueByKey(item.value, {
            body: utils.deepClone(config.data),
          })
        } else if (item.value && String(item.value).indexOf('res.') > -1) {
          value = utils.getObjectValueByKey(item.value, { res: response })
        }
        var handler = currentEvents[item.event]
        if (!handler) return
        tasks.push({
          eventItem: item,
          promise: Promise.resolve()
            .then(function () {
              return handler.call(currentEvents, {
                event: item,
                config: config,
                value: value,
                result: response,
              })
            })
            .then(function (eventResult) {
              return { status: 'fulfilled', value: eventResult || {} }
            })
            .catch(function (error) {
              return { status: 'rejected', reason: error }
            }),
        })
      })
      Promise.all(
        tasks.map(function (task) {
          return task.promise
        }),
      ).then(function (results) {
        result.status = 'success'
        results.forEach(function (item, index) {
          var eventItem = tasks[index].eventItem
          if (item.status === 'fulfilled') {
            var eventResult = item.value
            if (eventResult.config) result.config = eventResult.config
            result.list.push(
              Object.assign({}, eventItem, {
                status: 'success',
                realValue: eventResult.value,
                message: eventResult.message,
              }),
            )
          } else {
            result.status = 'error'
            result.list.push(
              Object.assign({}, eventItem, {
                status: 'error',
                message: item.reason && item.reason.message ? item.reason.message : String(item.reason || ''),
              }),
            )
          }
        })
        resolve(result)
      })
    })
  }

  function renderData(params, field, globalParams, appKey) {
    var data = utils.deepClone(params) || []
    return data.map(function (item) {
      var globalList = (globalParams && globalParams[field]) || []
      var allGlobal = globalList.find(function (p) {
        return p.name === item.name && p.appKey === 'all'
      })
      var appGlobal = globalList.find(function (p) {
        return p.name === item.name && p.appKey === appKey
      })
      var found = appGlobal || allGlobal
      if (found && found.value !== undefined && found.value !== '') {
        item.default = found.value
      } else if (item.mock) {
        item.default = AD.mock(item.mock)
      }
      item.id = utils.createRandKey()
      return item
    })
  }

  function handleQueryParams(queryParams, prefix) {
    if (!(queryParams && queryParams.length)) return queryParams || []
    var result = []
    queryParams.forEach(function (item) {
      if (item.type === 'object' && item.children && item.children.length) {
        var fix = prefix ? prefix + '[' + item.name + ']' : item.name
        result = result.concat(handleQueryParams(item.children, fix))
      } else if (item.type === 'array' && item.children && item.children.length) {
        var arrayFix = item.name + '[0]'
        result = result.concat(handleQueryParams(item.children, arrayFix))
      } else {
        if (prefix) item.name = prefix + '[' + item.name + ']'
        if (item.mock) item.default = AD.mock(item.mock)
        result.push(item)
      }
    })
    return result
  }

  function renderHeaderData(detail) {
    return renderData(detail.header, 'header', AD.appState.globalParams, detail.appKey)
  }

  function renderRouteData(detail) {
    return renderData(detail.routeParam, 'routeParam', {}, detail.appKey)
  }

  function renderQueryData(detail) {
    var data = renderData(detail.query, 'query', AD.appState.globalParams, detail.appKey)
    return handleQueryParams(data)
  }

  function renderBodyData(detail, renderType) {
    var params = detail.param || []
    if (
      detail.paramType === 'formdata' ||
      detail.paramType === 'form-data' ||
      renderType === 'array'
    ) {
      return renderData(params, 'body', AD.appState.globalParams, detail.appKey)
    }
    return AD.code.formatJson(
      AD.code.renderCodeJsonByParams(
        params,
        true,
        AD.appState.globalParams,
        detail.appKey,
      ),
    )
  }

  function renderApiParams(detail, paramsData) {
    var data = paramsData || {}
    var params = {}
    if (data.header && data.header.length) params.header = data.header
    else if (detail.header && detail.header.length) params.header = renderHeaderData(detail)

    if (data.query && data.query.length) params.query = data.query
    else if (detail.query && detail.query.length) params.query = renderQueryData(detail)

    if (data.body && data.body.length) params.body = data.body
    else if (detail.param && detail.param.length) params.body = renderBodyData(detail)

    if (data.routeParam && data.routeParam.length) params.routeParam = data.routeParam
    else if (detail.routeParam && detail.routeParam.length) params.routeParam = renderRouteData(detail)

    return params
  }

  function mergeGlobalParams(target, globalParams, feConfig, appKey) {
    ;['header', 'query', 'body'].forEach(function (key) {
      var list = (globalParams && globalParams[key]) || []
      list.forEach(function (item) {
        if (
          item.name &&
          item.value !== undefined &&
          item.value !== '' &&
          (!item.appKey || item.appKey === 'all' || item.appKey === appKey) &&
          target[key] &&
          (target[key][item.name] === undefined ||
            target[key][item.name] === null ||
            target[key][item.name] === '')
        ) {
          target[key][item.name] = encodeValue(item.value)
        }
      })
    })
    return target
  }

  function handleApiUrl(apiUrl, routeParam) {
    var url = apiUrl || ''
    ;(routeParam || []).forEach(function (item) {
      var placeholderKeys = [
        '/:' + item.name,
        '/<' + item.name + '>',
        '/<' + item.name + '?>',
        '/[:' + item.name + ']',
        '/{' + item.name + '}',
        '/{' + item.name + '?}',
      ]
      placeholderKeys.forEach(function (key) {
        if (url.indexOf(key) > -1) {
          var value = item.default ? '/' + item.default : ''
          url = url.replace(key, value)
        }
      })
    })
    return url
  }

  function getMethod(detail, options) {
    if (options && options.method) return String(options.method).toUpperCase()
    if (detail.method && typeof detail.method === 'string') return detail.method.toUpperCase()
    if (utils.isArray(detail.method) && detail.method.length) return String(detail.method[0]).toUpperCase()
    return 'GET'
  }

  function sendRequest(detail, config) {
    return AD.http.raw(config).then(function (response) {
      response.responseTime = utils.formatTime()
      if (detail.after && detail.after.length) {
        return handleRequestEvent(detail.after, config, response).then(function (afterEvents) {
          response.afterEvents = afterEvents
          return response
        })
      }
      return response
    })
  }

  function execute(detail, paramsData, options) {
    return new Promise(function (resolve, reject) {
      var data = paramsData || {}
      var params = renderApiParams(detail, data)
      var headerData = AD.code.renderCodeJsonByParams(data.header || [])
      var queryData = AD.code.renderCodeJsonByParams(data.query || [])
      var appConfig = AD.appState.appObject[detail.appKey] || {}
      var method = getMethod(detail, options)
      var bodyData
      var isFormData =
        detail.paramType === 'formdata' ||
        detail.paramType === 'form-data' ||
        utils.isArray(data.body)

      try {
        if (isFormData) {
          bodyData = new FormData()
          ;(data.body || []).forEach(function (item) {
            if (item.type === 'file') {
              var file = item.default && item.default[0]
              if (file) bodyData.append(item.name, file)
            } else if (item.type === 'files') {
              ;(item.default || []).forEach(function (file) {
                bodyData.append(item.name + '[]', file)
              })
            } else if (
              item.default !== undefined &&
              item.default !== null &&
              item.default !== ''
            ) {
              bodyData.append(item.name, item.default)
            }
          })
        } else if (typeof data.body === 'string' && data.body.trim()) {
          bodyData = utils.parseJson(data.body)
        } else {
          bodyData = {}
        }
      } catch (e) {
        reject(new Error(AD.t('apiPage.json.formatError')))
        return
      }

      var config = {
        url: handleApiUrl(detail.url, data.routeParam || []),
        method: method,
        headers: headerData,
        params: queryData,
        data: bodyData,
        baseURL: appConfig.host || undefined,
      }

      if (detail.contentType) {
        config.headers['content-type'] = detail.contentType
      } else if (isFormData) {
        config.headers['content-type'] = 'application/x-www-form-urlencoded'
      }

      mergeGlobalParams(
        { header: config.headers, query: config.params, body: config.data },
        AD.appState.globalParams,
        AD.appState.feConfig,
        detail.appKey,
      )

      function run(configValue) {
        var first =
          detail.before && detail.before.length
            ? handleRequestEvent(detail.before, configValue)
            : Promise.resolve(null)
        first
          .then(function (beforeEvents) {
            if (beforeEvents && beforeEvents.status === 'error') {
              reject({ beforeEvents: beforeEvents })
              return
            }
            sendRequest(detail, beforeEvents ? beforeEvents.config : configValue)
              .then(function (response) {
                if (beforeEvents) response.beforeEvents = beforeEvents
                resolve(response)
              })
              .catch(function (error) {
                if (beforeEvents) error.beforeEvents = beforeEvents
                reject(error)
              })
          })
          .catch(function (error) {
            reject(error)
          })
      }
      run(config)
    })
  }

  AD.debug = {
    renderData: renderData,
    handleQueryParams: handleQueryParams,
    renderHeaderData: renderHeaderData,
    renderRouteData: renderRouteData,
    renderQueryData: renderQueryData,
    renderBodyData: renderBodyData,
    renderApiParams: renderApiParams,
    mergeGlobalParams: mergeGlobalParams,
    handleApiUrl: handleApiUrl,
    handleRequestEvent: handleRequestEvent,
    execute: execute,
  }
})()