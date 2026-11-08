(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  function getBaseURL() {
    var state = AD.appState
    var hosts = state.feConfig.HTTP.HOSTS || []
    if (state.host) {
      var found = hosts.find(function (item) {
        return item.host === state.host
      })
      if (found) return found.host.replace(/\/+$/, '')
      return state.host.replace(/\/+$/, '')
    }
    if (hosts.length) return String(hosts[0].host || '').replace(/\/+$/, '')
    return ''
  }

  function getApiPrefix() {
    var prefix = AD.appState.feConfig.HTTP.API_PREFIX
    if (prefix === undefined || prefix === null || prefix === '') prefix = '/apidoc'
    return String(prefix).replace(/\/+$/, '')
  }

  function authPayload(payload, isGet) {
    var state = AD.appState
    var data = Object.assign({}, payload || {})
    if (state.lang && data.lang === undefined) data.lang = state.lang
    if (state.shareKey && data.shareKey === undefined) data.shareKey = state.shareKey
    if (data.token === undefined) {
      var token = AD.getAuthToken(data.appKey || state.appKey, data.shareKey || state.shareKey)
      if (token) data.token = token
    }
    return data
  }

  function buildURL(baseURL, path, query) {
    var url = baseURL + path
    var pairs = []
    Object.keys(query || {}).forEach(function (key) {
      var value = query[key]
      if (value === undefined || value === null) return
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value))
    })
    if (pairs.length) url += (url.indexOf('?') > -1 ? '&' : '?') + pairs.join('&')
    return url
  }

  function parseResponse(response) {
    var contentType = response.headers.get('content-type') || ''
    if (contentType.indexOf('application/json') > -1) {
      return response.json()
    }
    return response.text().then(function (text) {
      try {
        return JSON.parse(text)
      } catch (e) {
        return text
      }
    })
  }

  function fetchWithTimeout(url, options, timeout) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    var opts = Object.assign({}, options)
    if (controller) opts.signal = controller.signal
    var timer = null
    if (timeout) {
      timer = setTimeout(function () {
        if (controller) controller.abort()
      }, timeout)
    }
    return fetch(url, opts).finally(function () {
      if (timer) clearTimeout(timer)
    })
  }

  function createError(response, data, message) {
    var cfg = AD.appState.feConfig
    var codeField = cfg.AUTH.ERROR_CODE_FIELD || 'code'
    var code = data && typeof data === 'object' ? data[codeField] : undefined
    var status = response ? response.status : 200
    var isAuth = status === (cfg.AUTH.ERROR_STATUS || 401) || code === 4001 || code === 4002
    var error = new Error(
      (data && typeof data === 'object' && (data.message || data.msg)) ||
        message ||
        'Request failed: ' + status,
    )
    error.status = status
    error.code = code
    error.data = data
    error.isAuth = isAuth
    error.response = response
    return error
  }

  function api(path, payload, options) {
    var opts = options || {}
    var method = (opts.method || 'POST').toUpperCase()
    var state = AD.appState
    var data = authPayload(payload, method === 'GET')
    var url = getBaseURL() + getApiPrefix() + path
    var fetchOptions = {
      method: method,
      headers: {},
      credentials: state.feConfig.HTTP.WITHCREDENTIALS ? 'include' : 'same-origin',
    }

    if (method === 'GET') {
      url = buildURL('', url, data)
    } else {
      fetchOptions.headers['Content-Type'] = 'application/json;charset=utf-8'
      fetchOptions.body = JSON.stringify(data)
    }

    return fetchWithTimeout(url, fetchOptions, state.feConfig.HTTP.TIMEOUT)
      .then(function (response) {
        return parseResponse(response).then(function (body) {
          if (!response.ok) {
            throw createError(response, body, 'HTTP ' + response.status)
          }
          if (body && typeof body === 'object' && body.code !== undefined && body.code !== 0) {
            throw createError(response, body)
          }
          return body
        })
      })
      .catch(function (err) {
        if (err && err.isAuth) throw err
        if (err && err.status) throw err
        var error = new Error(err && err.name === 'AbortError' ? 'Request timeout' : err.message)
        error.status = 0
        error.isAuth = false
        error.data = null
        error.original = err
        throw error
      })
  }

  function raw(config) {
    var cfg = config || {}
    var state = AD.appState
    var method = (cfg.method || 'GET').toUpperCase()
    var baseURL = cfg.baseURL || getBaseURL()
    var url = cfg.url || ''
    if (!/^https?:\/\//i.test(url)) {
      url = baseURL.replace(/\/+$/, '') + (url.charAt(0) === '/' ? '' : '/') + url
    }
    url = buildURL('', url, cfg.params || {})
    var headers = Object.assign({}, cfg.headers || {})
    var body = cfg.data
    if (body !== undefined && body !== null && !(body instanceof FormData)) {
      if (typeof body !== 'string') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json;charset=utf-8'
        body = JSON.stringify(body)
      }
    }
    if (body instanceof FormData) {
      delete headers['Content-Type']
      delete headers['content-type']
    }
    var started = Date.now()
    return fetchWithTimeout(
      url,
      {
        method: method,
        headers: headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
        credentials: state.feConfig.HTTP.WITHCREDENTIALS ? 'include' : 'same-origin',
      },
      cfg.timeout || state.feConfig.HTTP.TIMEOUT,
    )
      .then(function (response) {
        return parseResponse(response).then(function (data) {
          var responseHeaders = {}
          response.headers.forEach(function (value, key) {
            responseHeaders[key] = value
          })
          return {
            status: response.status,
            statusText: response.statusText,
            data: data,
            headers: responseHeaders,
            url: response.url,
            timer: Date.now() - started,
          }
        })
      })
      .catch(function (err) {
        var error = err
        if (err && err.name === 'AbortError') {
          error = new Error('Request timeout')
        }
        error.timer = Date.now() - started
        error.status = error.status || 0
        error.isAuth = false
        throw error
      })
  }

  AD.http = {
    api: api,
    raw: raw,
    getBaseURL: getBaseURL,
    getApiPrefix: getApiPrefix,
    buildURL: buildURL,
  }
})()