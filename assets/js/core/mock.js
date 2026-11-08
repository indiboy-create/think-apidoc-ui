(function () {
  'use strict'

  var AD = (window.AD = window.AD || {})
  var Mock = window.Mock

  if (Mock && Mock.Random) {
    Mock.Random.extend({
      phone: function () {
        var phonePrefixs = [
          '130', '131', '132', '133', '135', '137', '138', '152', '155', '157',
          '159', '170', '177', '180', '182', '183', '185', '187', '188', '189', '191',
        ]
        return this.pick(phonePrefixs) + Mock.mock(/\d{8}/)
      },
      idcard: function () {
        return AD.utils.createIdcard()
      },
      regexp: function (expression) {
        var result = Mock.mock({ regexp: eval(expression) })
        return result.regexp
      },
    })
    var extendsConfig = AD.appState.feConfig.MOCK_EXTENDS || {}
    if (extendsConfig && Object.keys(extendsConfig).length) {
      Mock.Random.extend(extendsConfig)
    }
  }

  function mock(rule) {
    if (!rule) return ''
    if (!Mock) return rule
    try {
      return Mock.mock(rule)
    } catch (e) {
      return rule
    }
  }

  AD.mock = mock
})()