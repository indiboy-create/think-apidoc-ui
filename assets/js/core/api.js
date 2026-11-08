(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})

  var URL = {
    config: '/config',
    apiMenus: '/apiMenus',
    apiDetail: '/apiDetail',
    docMenus: '/docMenus',
    docDetail: '/docDetail',
    generator: '/generator',
    verifyAuth: '/verifyAuth',
    cancelAllCache: '/cancelAllCache',
    createAllCache: '/createAllCache',
    renderCodeTemplate: '/renderCodeTemplate',
    allApiMenus: '/allApiMenus',
    addApiShare: '/addApiShare',
    getApiShareList: '/getApiShareList',
    getApiShareDetail: '/getApiShareDetail',
    deleteApiShare: '/deleteApiShare',
    getShareApiMenus: '/getShareApiMenus',
    handleApiShareAction: '/handleApiShareAction',
    exportSwagger: '/exportSwagger',
  }

  function call(path, payload, options) {
    var opts = options || {}
    function run(retried) {
      return AD.http
        .api(path, payload, opts)
        .then(function (response) {
          return response.data
        })
        .catch(function (error) {
          if (error.isAuth && !retried && AD.auth) {
            return AD.auth.ensureAuth().then(function () {
              return run(true)
            })
          }
          throw error
        })
    }
    return run(false)
  }

  function post(path, payload) {
    return call(path, payload, { method: 'POST' })
  }

  function get(path, payload) {
    return call(path, payload, { method: 'GET' })
  }

  function verifyAuth(params) {
    return AD.http.api(URL.verifyAuth, params, { method: 'POST' }).then(function (response) {
      return response.data
    })
  }

  AD.api = {
    URL: URL,
    getConfig: function (params) {
      return get(URL.config, params)
    },
    getApiMenus: function (params) {
      return post(URL.apiMenus, params)
    },
    getApiDetail: function (params) {
      return post(URL.apiDetail, params)
    },
    getDocMenus: function (params) {
      return post(URL.docMenus, params)
    },
    getDocDetail: function (params) {
      return post(URL.docDetail, params)
    },
    generator: function (params) {
      return post(URL.generator, params)
    },
    verifyAuth: verifyAuth,
    cancelAllCache: function () {
      return post(URL.cancelAllCache, {})
    },
    createAllCache: function () {
      return post(URL.createAllCache, {})
    },
    renderCodeTemplate: function (params) {
      return post(URL.renderCodeTemplate, params)
    },
    getAllApiMenus: function () {
      return post(URL.allApiMenus, {})
    },
    addApiShare: function (params) {
      return post(URL.addApiShare, params)
    },
    getApiShareList: function (params) {
      return post(URL.getApiShareList, params)
    },
    getApiShareDetail: function (params) {
      return post(URL.getApiShareDetail, params)
    },
    deleteApiShare: function (params) {
      return post(URL.deleteApiShare, params)
    },
    getShareApiMenus: function (params) {
      return post(URL.getShareApiMenus, params)
    },
    handleApiShareAction: function (params) {
      return post(URL.handleApiShareAction, params)
    },
    exportSwagger: function (params) {
      return post(URL.exportSwagger, params)
    },
  }
})()