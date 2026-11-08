(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var utils = AD.utils

  var pendingPromise = null

  function openAuthModal() {
    return new Promise(function (resolve, reject) {
      layui.use(['layer'], function () {
        var layer = layui.layer
        var html =
          '<div class="ad-auth-modal">' +
          '<p class="ad-auth-tip">' + utils.escapeHtml(AD.t('auth.input.placeholder')) + '</p>' +
          '<input type="password" id="ad-auth-password" class="layui-input" autocomplete="off" ' +
          'placeholder="' + utils.escapeHtml(AD.t('auth.input.placeholder')) + '">' +
          '</div>'
        var closedByConfirm = false
        var index = layer.open({
          type: 1,
          title: AD.t('auth.title'),
          area: ['460px', 'auto'],
          shadeClose: false,
          closeBtn: 1,
          content: html,
          btn: [AD.t('common.ok'), AD.t('common.cancel')],
          success: function (layerEl) {
            var input = layerEl.find('#ad-auth-password')
            input[0].focus()
            input.on('keydown', function (event) {
              if (event.keyCode === 13) {
                layerEl.find('.layui-layer-btn0').trigger('click')
              }
            })
          },
          yes: function (index) {
            var password = document.getElementById('ad-auth-password').value
            if (!password) {
              layer.msg(AD.t('auth.input.placeholder'), { icon: 2 })
              return
            }
            var payload = {
              appKey: AD.appState.appKey,
              password: typeof window.md5 === 'function' ? window.md5(password) : password,
            }
            if (AD.appState.shareKey) payload.shareKey = AD.appState.shareKey
            AD.api
              .verifyAuth(payload)
              .then(function (data) {
                if (!data || !data.token) {
                  layer.msg(AD.t('auth.error'), { icon: 2 })
                  return
                }
                var key = AD.appState.shareKey
                  ? 'shareKey_' + AD.appState.shareKey
                  : AD.appState.appKey
                AD.setAuthToken(key, data.token)
                closedByConfirm = true
                layer.close(index)
                resolve(data.token)
              })
              .catch(function (error) {
                layer.msg(
                  (error.data && error.data.message) || error.message || AD.t('auth.error'),
                  { icon: 2 },
                )
              })
          },
          cancel: function () {
            if (!closedByConfirm) reject(new Error('auth cancelled'))
          },
          end: function () {
            if (!closedByConfirm) reject(new Error('auth cancelled'))
          },
        })
      })
    })
  }

  function ensureAuth() {
    if (pendingPromise) return pendingPromise
    pendingPromise = openAuthModal().finally(function () {
      pendingPromise = null
    })
    return pendingPromise
  }

  function handleError(error) {
    if (error && error.isAuth) {
      return ensureAuth().then(function () {
        return true
      })
    }
    AD.appState.globalError = error
    return Promise.resolve(false)
  }

  AD.auth = {
    ensureAuth: ensureAuth,
    handleError: handleError,
  }
})()